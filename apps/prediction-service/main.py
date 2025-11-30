import os
import json
import time
import base64
from typing import Dict, Any, List, Optional
from io import BytesIO
from collections import OrderedDict
import pika
from dotenv import load_dotenv
import mlflow.pytorch
import torch
import torch.nn as nn
from PIL import Image
from torchvision import transforms
import numpy as np
import cv2
from pydantic import BaseModel, Field
import boto3

# --- Configuration & Env ---
load_dotenv()

RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
PREDICTION_QUEUE = os.getenv('RABBITMQ_PREDICTION_QUEUE', 'prediction_queue')
RESULT_QUEUE = os.getenv('RABBITMQ_RESULT_QUEUE', 'prediction_result_queue')
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://localhost:5000') # Attention localhost vs mlflow service name

# AWS / MinIO Configuration
AWS_ACCESS_KEY_ID = os.getenv('AWS_ACCESS_KEY_ID', 'minioadmin')
AWS_SECRET_ACCESS_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', 'minioadmin')
AWS_ENDPOINT_URL = os.getenv('AWS_ENDPOINT', 'http://localhost:9000')
AWS_REGION = os.getenv('AWS_REGION', 'us-east-1')

mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🔥 Using device: {DEVICE}")

# =============================================================================
# 1. DÉFINITION DE L'ARCHITECTURE (OBLIGATOIRE POUR LE CHARGEMENT)
# =============================================================================
# Ces classes doivent être identiques à celles utilisées lors de l'entraînement
# pour que pickle puisse reconstruire l'objet.

class TreeNodeConfig(BaseModel):
    layers: List[int] = Field(default_factory=list)
    dropout: float = 0.0
    branches: Dict[str, 'TreeNodeConfig'] = Field(default_factory=dict)
    tasks: Dict[str, int] = Field(default_factory=dict)

TreeNodeConfig.model_rebuild()

class DynamicTreeBranch(nn.Module):
    def __init__(self, in_features: int, config: TreeNodeConfig):
        super().__init__()
        self.layers_seq = nn.Sequential()
        current_size = in_features
        
        for i, hidden_size in enumerate(config.layers):
            self.layers_seq.add_module(f"fc_{i}", nn.Linear(current_size, hidden_size))
            self.layers_seq.add_module(f"act_{i}", nn.ReLU())
            if config.dropout > 0:
                self.layers_seq.add_module(f"drop_{i}", nn.Dropout(config.dropout))
            current_size = hidden_size
            
        self.branches = nn.ModuleDict()
        self.tasks = nn.ModuleDict()
        
        for name, branch_cfg in config.branches.items():
            self.branches[name] = DynamicTreeBranch(current_size, branch_cfg)
        for name, num_classes in config.tasks.items():
            self.tasks[name] = nn.Linear(current_size, num_classes)

    def forward(self, x):
        x = self.layers_seq(x)
        results = {}
        for branch in self.branches.values():
            results.update(branch(x))
        for name, task_layer in self.tasks.items():
            results[name] = task_layer(x)
        return results

class CNN(nn.Module):
    def __init__(self, filters_list: List[int], tree_structure: TreeNodeConfig):
        super().__init__()
        self.filters_list = filters_list
        # On stocke le dump pour compatibilité, même si on ne l'utilise pas ici
        self.tree_structure_dict = tree_structure.model_dump() 
        
        layers = []
        in_channels = 3
        for i, out_channels in enumerate(filters_list):
            layers.append(nn.Conv2d(in_channels, out_channels, 3, padding=1))
            layers.append(nn.BatchNorm2d(out_channels))
            layers.append(nn.ReLU())
            if i > 0: 
                layers.append(nn.MaxPool2d(2))
            in_channels = out_channels
        self.conv = nn.Sequential(*layers)
        
        with torch.no_grad():
            dummy = torch.zeros(1, 3, 64, 64)
            out = self.conv(dummy)
            self.flattened_size = out.view(1, -1).size(1)
            
        self.tree = DynamicTreeBranch(self.flattened_size, tree_structure)

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        return self.tree(x)

# =============================================================================
# 2. SERVICE DE PRÉDICTION
# =============================================================================

class PredictionService:
    def __init__(self):
        self.connection = None
        self.channel = None
        # Utilisation d'un OrderedDict pour un cache LRU simple
        self.loaded_models = OrderedDict()
        self.MAX_CACHE_SIZE = 3 # Garder max 3 modèles en VRAM pour éviter OOM
        
        self.target_size = (64, 64)
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        # S3 Client
        self.s3_client = boto3.client(
            's3',
            endpoint_url=AWS_ENDPOINT_URL,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        print(f"✅ S3 Client configured for {AWS_ENDPOINT_URL}")
        
        self.setup_connection()

    def setup_connection(self):
        """Setup RabbitMQ connection with retry logic"""
        while True:
            try:
                parameters = pika.URLParameters(RABBITMQ_URL)
                self.connection = pika.BlockingConnection(parameters)
                self.channel = self.connection.channel()
                self.channel.queue_declare(queue=PREDICTION_QUEUE, durable=True)
                self.channel.queue_declare(queue=RESULT_QUEUE, durable=True)
                self.channel.basic_qos(prefetch_count=1)
                
                print(f"✅ Connected to RabbitMQ")
                print(f"📥 Queue: {PREDICTION_QUEUE} | 📤 Queue: {RESULT_QUEUE}")
                break
            except Exception as e:
                print(f"❌ RabbitMQ connection failed: {e}. Retrying in 5s...")
                time.sleep(5)

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """Robust face cropping & resizing"""
        try:
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Détection basique de contours (simule une détection visage sur fond uni)
            _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if not contours:
                return image.resize(self.target_size, Image.LANCZOS)
            
            largest_contour = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Marge de sécurité
            img_cropped = img_cv[y:y+h, x:x+w]
            
            if img_cropped.size == 0: return image.resize(self.target_size, Image.LANCZOS)
            
            img_resized = cv2.resize(img_cropped, self.target_size, interpolation=cv2.INTER_AREA)
            return Image.fromarray(cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB))
            
        except Exception as e:
            print(f"⚠️ Preprocessing warning: {e}, falling back to resize")
            return image.resize(self.target_size, Image.LANCZOS)

    def load_model(self, model_uri: str):
        """Load model from MLflow with LRU Caching"""
        
        # 1. Si déjà chargé, on le déplace à la fin (le plus récent)
        if model_uri in self.loaded_models:
            self.loaded_models.move_to_end(model_uri)
            return self.loaded_models[model_uri]
        
        # 2. Gestion du cache plein : on supprime le premier (le plus vieux)
        if len(self.loaded_models) >= self.MAX_CACHE_SIZE:
            oldest_uri, _ = self.loaded_models.popitem(last=False)
            print(f"🧹 Freeing memory: Unloaded {old_uri}")
            if torch.cuda.is_available():
                torch.cuda.empty_cache()

        # 3. Chargement depuis MLflow
        try:
            print(f"📦 Downloading & Loading: {model_uri}")
            # C'est ici que MLflow a besoin que les classes soient définies
            model = mlflow.pytorch.load_model(model_uri, map_location=DEVICE)
            model.to(DEVICE)
            model.eval()
            
            # 4. Warm-up (Optionnel mais recommandé pour CUDA)
            with torch.no_grad():
                dummy = torch.randn(1, 3, 64, 64).to(DEVICE)
                model(dummy)
            
            self.loaded_models[model_uri] = model
            print(f"✅ Model ready: {model_uri}")
            return model
            
        except Exception as e:
            print(f"❌ CRITICAL: Failed to load {model_uri}: {e}")
            raise

    def download_image_from_s3(self, bucket_name: str, s3_key: str) -> Image.Image:
        try:
            print(f"📥 Downloading from S3: {bucket_name}/{s3_key}")
            response = self.s3_client.get_object(Bucket=bucket_name, Key=s3_key)
            image_data = response['Body'].read()
            return Image.open(BytesIO(image_data)).convert('RGB')
        except Exception as e:
            print(f"❌ S3 Download failed: {e}")
            raise

    def predict_with_model(self, image_id: str, bucket_name: str, s3_key: str, model_uri: str, image_base64: Optional[str] = None) -> Dict[str, Any]:
        try:
            model = self.load_model(model_uri)
            
            # Download & Process
            if image_base64:
                try:
                    print(f"⚡ Using Base64 image for {image_id}")
                    image_data = base64.b64decode(image_base64)
                    image = Image.open(BytesIO(image_data)).convert('RGB')
                except Exception as e:
                    print(f"⚠️ Base64 decode failed: {e}, falling back to S3")
                    image = self.download_image_from_s3(bucket_name, s3_key)
            else:
                image = self.download_image_from_s3(bucket_name, s3_key)

            image_pre = self.preprocess_image(image)
            
            img_tensor = self.transform(image_pre).unsqueeze(0).to(DEVICE)
            
            # Inference
            with torch.no_grad():
                # outputs est maintenant un Dict ! {'barbe': tensor, ...}
                outputs = model(img_tensor)
            
            # Parsing dynamique basé sur les clés du dictionnaire
            result = {}
            
            # Mapping des labels (Doit correspondre à l'entraînement)
            hair_lengths = ['long', 'short', 'bald']
            hair_colors = ['blond', 'lightBrown', 'red', 'darkBrown', 'grayBlue']

            # Extraction robuste
            def get_binary(key):
                if key in outputs:
                    return bool(torch.sigmoid(outputs[key].squeeze()).item() > 0.5)
                return False # Valeur par défaut
                
            def get_multi(key, labels):
                if key in outputs:
                    idx = torch.argmax(outputs[key], dim=1).item()
                    # Protection contre index out of bounds
                    return labels[idx] if 0 <= idx < len(labels) else labels[0]
                return labels[0]

            result['beard'] = get_binary('barbe')
            result['mustache'] = get_binary('moustache')
            result['glasses'] = get_binary('lunettes')
            result['hairLength'] = get_multi('taille_cheveux', hair_lengths)
            result['hairColor'] = get_multi('couleur_cheveux', hair_colors)
            
            print(f"📊 Prediction {image_id}: {result}")
            return result

        except Exception as e:
            print(f"❌ Error prediction {image_id}: {e}")
            raise

    def process_prediction_request(self, ch, method, properties, body):
        try:
            msg = json.loads(body)
            # Support NestJS Pattern
            payload = msg.get('data', msg)
            
            image_id = payload.get('imageId')
            s3_key = payload.get('s3Key')
            bucket_name = payload.get('bucketName')
            model_uri = payload.get('modelName') # ex: "runs:/<run_id>/model" ou "models:/FaceAttr/Production"
            image_base64 = payload.get('imageBase64')
            
            if not all([image_id, s3_key, bucket_name, model_uri]):
                raise ValueError("Missing fields (imageId, s3Key, bucketName or modelName)")

            prediction = self.predict_with_model(image_id, bucket_name, s3_key, model_uri, image_base64)
            
            response = {
                'pattern': 'prediction_result',
                'data': {
                    'imageId': image_id,
                    'modelName': model_uri,
                    'result': prediction,
                    'success': True
                }
            }
            
            self.channel.basic_publish(
                exchange='',
                routing_key=RESULT_QUEUE,
                body=json.dumps(response),
                properties=pika.BasicProperties(delivery_mode=2, content_type='application/json')
            )
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            print(f"❌ Processing failed: {e}")
            # Send error if possible
            if 'image_id' in locals():
                 err_response = {
                    'pattern': 'prediction_result',
                    'data': {'imageId': image_id, 'success': False, 'error': str(e)}
                }
                 self.channel.basic_publish(
                    exchange='', routing_key=RESULT_QUEUE, body=json.dumps(err_response)
                )
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def start(self):
        print("🚀 Service Started. Waiting for requests...")
        try:
            self.channel.basic_consume(queue=PREDICTION_QUEUE, on_message_callback=self.process_prediction_request)
            self.channel.start_consuming()
        except KeyboardInterrupt:
            self.stop()
            
    def stop(self):
        if self.connection: self.connection.close()
        print("👋 Service Stopped")

if __name__ == '__main__':
    service = PredictionService()
    service.start()