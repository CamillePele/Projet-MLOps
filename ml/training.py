import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset, random_split
from torchvision import transforms
import pandas as pd
from PIL import Image
import numpy as np
import mlflow
import mlflow.pytorch
from mlflow.models import infer_signature
from hyperopt import fmin, tpe, hp, STATUS_OK, Trials

# --- Configuration ---
CSV_PATH = "../annotations.csv"
IMG_DIR = "../dataset_prepro/"
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"Using device: {DEVICE}")

# --- Dataset Class ---
class DatasetFaces(Dataset):   
    def __init__(self, csv_file, img_dir, transform=None, file_extension='.jpg'):
        self.annotations = pd.read_csv(csv_file, index_col='filename')
        self.img_names = self.annotations.index.tolist()
        self.img_dir = img_dir
        self.transform = transform
        self.file_extension = file_extension

    def __len__(self):
        return len(self.img_names)

    def __getitem__(self, idx):
        img_name_base = self.img_names[idx]
        img_name_with_ext = img_name_base + self.file_extension
        img_path = os.path.join(self.img_dir, img_name_with_ext)
        
        try:
            image = Image.open(img_path).convert('RGB')
        except FileNotFoundError:
            # En cas d'image manquante, on pourrait retourner None, 
            # mais pour simplifier ici on va générer une image noire ou lever une erreur
            # Pour l'entraînement, mieux vaut s'assurer que les données sont propres.
            image = Image.new('RGB', (64, 64)) 

        labels = self.annotations.loc[img_name_base].values
        labels = torch.tensor(labels.astype(float), dtype=torch.float32)

        if self.transform:
            image = self.transform(image)

        return image, labels

# --- Model Class ---
class CNN(nn.Module):
    def __init__(self, filters_list=[8, 16, 32], fc_size=256):
        super().__init__()
        
        layers = []
        in_channels = 3
        
        # Construction dynamique des couches convolutives
        for i, out_channels in enumerate(filters_list):
            layers.append(nn.Conv2d(in_channels, out_channels, 3, padding=1))
            layers.append(nn.ReLU())
            # Pooling après chaque couche sauf la première (pour garder de la résolution au début)
            if i > 0:
                layers.append(nn.MaxPool2d(2))
            in_channels = out_channels
            
        self.conv = nn.Sequential(*layers)
        
        # Calcul dynamique de la taille après convolution
        with torch.no_grad():
            dummy_input = torch.zeros(1, 3, 64, 64)
            dummy_out = self.conv(dummy_input)
            self.flattened_size = dummy_out.view(1, -1).size(1)
        
        # Input dynamic -> fc_size
        self.common_fc = nn.Sequential(
            nn.Linear(self.flattened_size, fc_size), nn.ReLU(),
        )

        # Têtes Binaires
        self.classifier_barbe = nn.Sequential(
            nn.Linear(fc_size, 64), nn.ReLU(),
            nn.Linear(64, 1)
        )
        self.classifier_moustache = nn.Sequential(
            nn.Linear(fc_size, 64), nn.ReLU(),
            nn.Linear(64, 1)
        )
        self.classifier_lunettes = nn.Sequential(
            nn.Linear(fc_size, 64), nn.ReLU(),
            nn.Linear(64, 1)
        )
        
        # Branche "Cheveux"
        self.classifier_cheveux_features = nn.Sequential(
            nn.Linear(fc_size, 128), nn.ReLU()
        )
        self.classifier_taille_cheveux = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, 3)
        )
        self.classifier_couleur_cheveux = nn.Sequential(
            nn.Linear(128, 64), nn.ReLU(),
            nn.Linear(64, 5)
        )

    def forward(self, x):
        x = self.conv(x)
        x = x.view(x.size(0), -1)
        common_features = self.common_fc(x)

        out_barbe = self.classifier_barbe(common_features)
        out_moustache = self.classifier_moustache(common_features)
        out_lunettes = self.classifier_lunettes(common_features)
        
        cheveux_features = self.classifier_cheveux_features(common_features)
        out_taille_cheveux = self.classifier_taille_cheveux(cheveux_features)
        out_couleur_cheveux = self.classifier_couleur_cheveux(cheveux_features)

        return [out_barbe, out_moustache, out_lunettes, out_taille_cheveux, out_couleur_cheveux]

# --- Helper to get DataLoaders ---
def get_data_loaders(batch_size):
    data_transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406],
                             std=[0.229, 0.224, 0.225])
    ])

    # On suppose que les images sont des .jpg par défaut, ajustez si nécessaire (.png)
    full_dataset = DatasetFaces(csv_file=CSV_PATH,
                                img_dir=IMG_DIR,
                                transform=data_transform,
                                file_extension=".png") # Ajuster selon votre dataset

    total_size = len(full_dataset)
    train_size = int(0.7 * total_size)
    test_size = total_size - train_size

    generator = torch.Generator().manual_seed(42)
    train_dataset, test_dataset = random_split(full_dataset, [train_size, test_size], generator=generator)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_dataset, batch_size=batch_size, shuffle=False)
    
    return train_loader, test_loader

# --- Training Function (Objective for Hyperopt) ---
def objective(params):
    # Start MLflow run
    with mlflow.start_run():
        # Log hyperparameters
        mlflow.log_params(params)
        
        lr = params['lr']
        batch_size = int(params['batch_size'])
        epochs = int(params['epochs'])
        
        # Architecture Hyperparameters
        n_layers = int(params['n_layers'])
        base_filters = int(params['base_filters'])
        fc_size = int(params['fc_size'])
        
        # Construct filters list: e.g. [16, 32, 64]
        filters_list = [base_filters * (2**i) for i in range(n_layers)]
        
        print(f"\n🚀 Starting run with: lr={lr:.5f}, batch={batch_size}, layers={n_layers} ({filters_list}), fc={fc_size}")

        # Data
        try:
            train_loader, test_loader = get_data_loaders(batch_size)
        except Exception as e:
            print(f"Error loading data: {e}")
            return {'loss': float('inf'), 'status': STATUS_OK}

        # Model & Optimization
        model = CNN(filters_list=filters_list, fc_size=fc_size).to(DEVICE)
        optimizer = optim.Adam(model.parameters(), lr=lr)
        
        criterion_binaire = nn.BCEWithLogitsLoss().to(DEVICE)
        criterion_multiclasse = nn.CrossEntropyLoss().to(DEVICE)

            # Training Loop
        for epoch in range(epochs):
            model.train()
            running_loss = 0.0
            
            print(f"Epoch {epoch+1}/{epochs}")
            
            for batch_idx, (images, labels) in enumerate(train_loader):
                images, labels = images.to(DEVICE), labels.to(DEVICE)
                
                optimizer.zero_grad()
                outputs = model(images)
                out_barbe, out_moustache, out_lunettes, out_taille, out_couleur = outputs
                
                # Labels preparation
                lab_barbe = labels[:, 0].float()
                lab_moustache = labels[:, 1].float()
                lab_lunettes = labels[:, 2].float()
                lab_taille = torch.argmax(labels[:, 3:6], dim=1)
                lab_couleur = torch.argmax(labels[:, 6:11], dim=1)

                # Loss calculation
                loss_barbe = criterion_binaire(out_barbe.squeeze(), lab_barbe)
                loss_moustache = criterion_binaire(out_moustache.squeeze(), lab_moustache)
                loss_lunettes = criterion_binaire(out_lunettes.squeeze(), lab_lunettes)
                loss_taille = criterion_multiclasse(out_taille, lab_taille)
                loss_couleur = criterion_multiclasse(out_couleur, lab_couleur)
                
                total_loss = loss_barbe + loss_moustache + loss_lunettes + loss_taille + loss_couleur
                
                total_loss.backward()
                optimizer.step()
                
                running_loss += total_loss.item()
                if batch_idx % 50 == 0:
                    print(f"   Batch {batch_idx}/{len(train_loader)} - Loss: {total_loss.item():.3f}")
            
            avg_train_loss = running_loss / len(train_loader)
            mlflow.log_metric("train_loss", avg_train_loss, step=epoch)
            
            # Validation Loop
            model.eval()
            val_loss = 0.0
            
            # Accuracy counters
            correct_barbe = 0
            correct_moustache = 0
            correct_lunettes = 0
            correct_taille = 0
            correct_couleur = 0
            total_samples = 0
            
            with torch.no_grad():
                for images, labels in test_loader:
                    images, labels = images.to(DEVICE), labels.to(DEVICE)
                    outputs = model(images)
                    out_barbe, out_moustache, out_lunettes, out_taille, out_couleur = outputs
                    
                    lab_barbe = labels[:, 0].float()
                    lab_moustache = labels[:, 1].float()
                    lab_lunettes = labels[:, 2].float()
                    lab_taille = torch.argmax(labels[:, 3:6], dim=1)
                    lab_couleur = torch.argmax(labels[:, 6:11], dim=1)

                    l_barbe = criterion_binaire(out_barbe.squeeze(), lab_barbe)
                    l_moustache = criterion_binaire(out_moustache.squeeze(), lab_moustache)
                    l_lunettes = criterion_binaire(out_lunettes.squeeze(), lab_lunettes)
                    l_taille = criterion_multiclasse(out_taille, lab_taille)
                    l_couleur = criterion_multiclasse(out_couleur, lab_couleur)
                    
                    val_loss += (l_barbe + l_moustache + l_lunettes + l_taille + l_couleur).item()
                    
                    # Accuracy calculation
                    batch_size = images.size(0)
                    total_samples += batch_size
                    
                    pred_barbe = (torch.sigmoid(out_barbe.squeeze()) > 0.5).float()
                    correct_barbe += (pred_barbe == lab_barbe).sum().item()
                    
                    pred_moustache = (torch.sigmoid(out_moustache.squeeze()) > 0.5).float()
                    correct_moustache += (pred_moustache == lab_moustache).sum().item()
                    
                    pred_lunettes = (torch.sigmoid(out_lunettes.squeeze()) > 0.5).float()
                    correct_lunettes += (pred_lunettes == lab_lunettes).sum().item()
                    
                    pred_taille = torch.argmax(out_taille, dim=1)
                    correct_taille += (pred_taille == lab_taille).sum().item()
                    
                    pred_couleur = torch.argmax(out_couleur, dim=1)
                    correct_couleur += (pred_couleur == lab_couleur).sum().item()
            
            avg_val_loss = val_loss / len(test_loader)
            
            # Calculate accuracies
            acc_barbe = correct_barbe / total_samples * 100
            acc_moustache = correct_moustache / total_samples * 100
            acc_lunettes = correct_lunettes / total_samples * 100
            acc_taille = correct_taille / total_samples * 100
            acc_couleur = correct_couleur / total_samples * 100
            
            # Log metrics
            mlflow.log_metric("val_loss", avg_val_loss, step=epoch)
            mlflow.log_metric("acc_barbe", acc_barbe, step=epoch)
            mlflow.log_metric("acc_moustache", acc_moustache, step=epoch)
            mlflow.log_metric("acc_lunettes", acc_lunettes, step=epoch)
            mlflow.log_metric("acc_taille", acc_taille, step=epoch)
            mlflow.log_metric("acc_couleur", acc_couleur, step=epoch)
            
            print(f"   📉 Val Loss: {avg_val_loss:.4f}")
            print(f"   ✅ Accuracies:")
            print(f"      🧔 Barbe     : {acc_barbe:.2f}%")
            print(f"      👨 Moustache : {acc_moustache:.2f}%")
            print(f"      👓 Lunettes  : {acc_lunettes:.2f}%")
            print(f"      💇 Taille    : {acc_taille:.2f}%")
            print(f"      🎨 Couleur   : {acc_couleur:.2f}%")

        # Generate signature and input example
        model.eval()
        with torch.no_grad():
            dummy_input = torch.randn(1, 3, 64, 64).to(DEVICE)
            sample_output = model(dummy_input)
            
            # Convert to numpy for MLflow signature
            dummy_input_np = dummy_input.cpu().numpy()
            # sample_output is a list of tensors
            sample_output_np = [x.cpu().numpy() for x in sample_output]
            
            signature = infer_signature(dummy_input_np, sample_output_np)

        # Log model
        mlflow.pytorch.log_model(
            pytorch_model=model, 
            artifact_path="model",
            signature=signature,
            pip_requirements=["torch", "torchvision", "pandas", "numpy", "Pillow"]
        )
        
        # Return loss to minimize
        return {'loss': avg_val_loss, 'status': STATUS_OK}

if __name__ == "__main__":
    # Connect to local MLflow server
    mlflow.set_tracking_uri("http://localhost:5000")
    
    # Set MLflow experiment
    mlflow.set_experiment("CNN_Face_Attributes_Optimization")

    # Define search space
    space = {
        'lr': hp.loguniform('lr', np.log(5e-4), np.log(5e-3)), # Resserré autour de 0.001
        'batch_size': hp.choice('batch_size', [32, 64]),
        'epochs': hp.choice('epochs', [5, 10]),
        'n_layers': hp.choice('n_layers', [2, 3]),
        'base_filters': hp.choice('base_filters', [8, 16]),
        'fc_size': hp.choice('fc_size', [256, 512])
    }
    
    print("🧠 Starting Hyperparameter Optimization with Hyperopt...")
    
    trials = Trials()
    best = fmin(fn=objective,
                space=space,
                algo=tpe.suggest,
                max_evals=10, # Nombre d'essais
                trials=trials)
                
    print("\n🏆 Best Hyperparameters found:")
    print(best)
