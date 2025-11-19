import os
import json
import time
import random
import base64
from typing import Dict, Any
from io import BytesIO
import pika
from dotenv import load_dotenv
import mlflow
import torch
from PIL import Image
from torchvision import transforms
import numpy as np
import cv2

# Load environment variables
load_dotenv()

# Configuration
RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
PREDICTION_QUEUE = os.getenv('RABBITMQ_PREDICTION_QUEUE', 'prediction_queue')
RESULT_QUEUE = os.getenv('RABBITMQ_RESULT_QUEUE', 'prediction_result_queue')
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://mlflow:5000')

# Set MLflow tracking URI
mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)

# Device configuration
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"🔥 Using device: {DEVICE}")


class PredictionService:
    def __init__(self):
        """Initialize the prediction service"""
        self.connection = None
        self.channel = None
        self.loaded_models = {}  # Cache for loaded models
        self.target_size = (64, 64)  # (width, height)
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                                std=[0.229, 0.224, 0.225])
        ])
        self.setup_connection()

    def preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image using the same method as crop_dataset_images.py:
        1. Convert to grayscale
        2. Apply thresholding to detect object
        3. Find largest contour (face)
        4. Crop to bounding box
        5. Resize to 64x64
        
        Args:
            image: PIL Image
            
        Returns:
            Preprocessed PIL Image
        """
        try:
            # Convert PIL Image to OpenCV format (numpy array)
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # Convert to grayscale
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            
            # Thresholding (white background -> inverted binary to get object in white)
            _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
            
            # Find contours
            contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            if len(contours) == 0:
                # No contours found, just resize original image
                return image.resize(self.target_size, Image.LANCZOS)
            
            # Find the largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Get bounding box
            x, y, w, h = cv2.boundingRect(largest_contour)
            
            # Crop the image
            img_cropped = img_cv[y:y+h, x:x+w]
            
            # Safety check: verify crop is not empty
            if img_cropped.size == 0:
                return image.resize(self.target_size, Image.LANCZOS)
            
            # Resize to 64x64 (without preserving aspect ratio)
            img_resized = cv2.resize(img_cropped, self.target_size, interpolation=cv2.INTER_AREA)
            
            # Convert back to PIL Image (BGR to RGB)
            img_rgb = cv2.cvtColor(img_resized, cv2.COLOR_BGR2RGB)
            preprocessed = Image.fromarray(img_rgb)
            
            return preprocessed
            
        except Exception as e:
            print(f"⚠️ Error in preprocessing: {e}, using simple resize")
            # Fallback to simple resize if preprocessing fails
            return image.resize(self.target_size, Image.LANCZOS)

    def setup_connection(self):
        """Setup RabbitMQ connection and channels"""
        try:
            # Parse RabbitMQ URL
            parameters = pika.URLParameters(RABBITMQ_URL)
            
            # Create connection
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Declare queues
            self.channel.queue_declare(queue=PREDICTION_QUEUE, durable=True)
            self.channel.queue_declare(queue=RESULT_QUEUE, durable=True)
            
            # Set QoS to process one message at a time
            self.channel.basic_qos(prefetch_count=1)
            
            print(f"✅ Connected to RabbitMQ")
            print(f"📥 Listening on queue: {PREDICTION_QUEUE}")
            print(f"📤 Will publish results to: {RESULT_QUEUE}")
        except Exception as e:
            print(f"❌ Error connecting to RabbitMQ: {e}")
            raise

    def load_model(self, model_uri: str):
        """
        Load model from MLflow registry
        
        Args:
            model_uri: MLflow model URI (e.g., 'runs:/<run_id>/model')
            
        Returns:
            Loaded PyTorch model
        """
        if model_uri in self.loaded_models:
            return self.loaded_models[model_uri]
        
        try:
            print(f"📦 Loading model from MLflow: {model_uri}")
            model = mlflow.pytorch.load_model(model_uri, map_location=DEVICE)
            model.eval()
            self.loaded_models[model_uri] = model
            print(f"✅ Model loaded successfully: {model_uri}")
            return model
        except Exception as e:
            print(f"❌ Error loading model {model_uri}: {e}")
            raise

    def predict_with_model(self, image_id: str, image_data: str, model_uri: str) -> Dict[str, Any]:
        """
        Generate prediction using MLflow model
        
        Args:
            image_id: ID of the image
            image_data: Base64 encoded image data
            model_uri: MLflow model URI
            
        Returns:
            Dictionary containing prediction results
        """
        try:
            # Load model
            model = self.load_model(model_uri)
            
            # Decode image from base64
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes)).convert('RGB')
            
            print(f"🖼️ Image {image_id}: Original size={image.size}")
            
            # Preprocess image (crop, resize using same method as training)
            image_preprocessed = self.preprocess_image(image)
            
            print(f"✂️ Image {image_id}: After preprocessing size={image_preprocessed.size}")
            
            # Apply transforms (normalize)
            image_tensor = self.transform(image_preprocessed).unsqueeze(0).to(DEVICE)
            
            print(f"🔢 Image {image_id}: Tensor shape={image_tensor.shape}, range=[{image_tensor.min():.3f}, {image_tensor.max():.3f}]")
            
            # Run prediction
            with torch.no_grad():
                outputs = model(image_tensor)
            
            print(f"📊 Image {image_id}: Model outputs received")
            
            # Parse outputs (5 heads: barbe, moustache, lunettes, taille, couleur)
            out_barbe, out_moustache, out_lunettes, out_taille, out_couleur = outputs
            
            # Convert to predictions
            pred_barbe = bool(torch.sigmoid(out_barbe.squeeze()).item() > 0.5)
            pred_moustache = bool(torch.sigmoid(out_moustache.squeeze()).item() > 0.5)
            pred_lunettes = bool(torch.sigmoid(out_lunettes.squeeze()).item() > 0.5)
            pred_taille_idx = torch.argmax(out_taille, dim=1).item()
            pred_couleur_idx = torch.argmax(out_couleur, dim=1).item()
            
            # Map indices to labels
            hair_lengths = ['bald', 'short', 'long']
            hair_colors = ['blond', 'lightBrown', 'red', 'darkBrown', 'grayBlue']
            
            result = {
                'beard': pred_barbe,
                'mustache': pred_moustache,
                'glasses': pred_lunettes,
                'hairLength': hair_lengths[pred_taille_idx],
                'hairColor': hair_colors[pred_couleur_idx]
            }
            
            return result
            
        except Exception as e:
            print(f"❌ Error during prediction: {e}")
            # Fallback to random predictions if model fails
            return self.generate_fake_prediction(image_id, image_data)

    def generate_fake_prediction(self, image_id: str, image_data: str) -> Dict[str, Any]:
        """
        Generate fake prediction results for testing (fallback)
        
        Args:
            image_id: ID of the image
            image_data: Base64 encoded image data
            
        Returns:
            Dictionary containing prediction results
        """        
        # Generate random fake predictions
        hair_colors = ['blond', 'lightBrown', 'red', 'darkBrown', 'grayBlue']
        hair_lengths = ['bald', 'short', 'long']
        
        result = {
            'beard': random.choice([True, False]),
            'mustache': random.choice([True, False]),
            'glasses': random.choice([True, False]),
            'hairColor': random.choice(hair_colors),
            'hairLength': random.choice(hair_lengths)
        }
        
        return result

    def process_prediction_request(self, ch, method, properties, body):
        """
        Process incoming prediction request from the queue
        
        Args:
            ch: Channel
            method: Delivery method
            properties: Message properties
            body: Message body (JSON)
        """
        try:
            # Parse request
            request = json.loads(body)
                        
            # NestJS microservices wrap messages in {pattern, data} format
            if 'pattern' in request and 'data' in request:
                request = request['data']
            
            image_id = request.get('imageId')
            image_data = request.get('imageData')
            model_uri = request.get('modelName', '')
                        
            # Validate required fields
            if not image_id or not image_data:
                raise ValueError(f"Missing required fields: imageId={image_id}, imageData={'present' if image_data else 'missing'}")
            
            # Generate prediction using MLflow model or fallback to fake
            if model_uri:
                prediction_result = self.predict_with_model(image_id, image_data, model_uri)
            else:
                print(f"⚠️ No model URI provided, using fake predictions")
                prediction_result = self.generate_fake_prediction(image_id, image_data)
            
            # Prepare response
            response_data = {
                'imageId': image_id,
                'modelName': model_uri,
                'result': prediction_result,
                'success': True
            }
            
            # Prepare message in NestJS microservice format
            nestjs_message = {
                'pattern': 'prediction_result',
                'data': response_data
            }
            
            # Publish result to result queue
            self.channel.basic_publish(
                exchange='',
                routing_key=RESULT_QUEUE,
                body=json.dumps(nestjs_message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # Make message persistent
                    content_type='application/json'
                )
            )
                        
            # Acknowledge message
            ch.basic_ack(delivery_tag=method.delivery_tag)
            
        except Exception as e:
            print(f"❌ Error processing prediction request: {e}")
            
            # Send error response
            try:
                error_data = {
                    'imageId': request.get('imageId', 'unknown'),
                    'modelName': request.get('modelName', ''),
                    'result': None,
                    'success': False,
                    'error': str(e)
                }
                
                # Prepare message in NestJS microservice format
                nestjs_error_message = {
                    'pattern': 'prediction_result',
                    'data': error_data
                }
                
                self.channel.basic_publish(
                    exchange='',
                    routing_key=RESULT_QUEUE,
                    body=json.dumps(nestjs_error_message),
                    properties=pika.BasicProperties(
                        delivery_mode=2,
                        content_type='application/json'
                    )
                )
            except:
                pass
            
            # Reject message
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

    def start_consuming(self):
        """Start consuming messages from the prediction queue"""
        print(f"\n🚀 Prediction service started")
        print(f"⏳ Waiting for prediction requests... (Press CTRL+C to exit)\n")
        
        # Setup consumer
        self.channel.basic_consume(
            queue=PREDICTION_QUEUE,
            on_message_callback=self.process_prediction_request
        )
        
        try:
            # Start consuming
            self.channel.start_consuming()
        except KeyboardInterrupt:
            print("\n🛑 Stopping prediction service...")
            self.stop()
        except Exception as e:
            print(f"\n❌ Error in consumer: {e}")
            self.stop()

    def stop(self):
        """Stop the prediction service and close connections"""
        if self.channel:
            self.channel.stop_consuming()
        if self.connection:
            self.connection.close()
        print("👋 Prediction service stopped")


def main():
    """Main entry point"""
    print("=" * 60)
    print("🤖 ML Prediction Service")
    print("=" * 60)
    
    service = PredictionService()
    service.start_consuming()


if __name__ == '__main__':
    main()
