import os
import time
import mlflow
from mlflow.tracking import MlflowClient

# Configuration
MLFLOW_TRACKING_URI = os.getenv('MLFLOW_TRACKING_URI', 'http://mlflow:5000')
MODELS_DIR = '/app/models'

def wait_for_mlflow():
    print(f"Waiting for MLflow at {MLFLOW_TRACKING_URI}...")
    while True:
        try:
            client = MlflowClient(tracking_uri=MLFLOW_TRACKING_URI)
            client.search_experiments()
            print("✅ MLflow is ready!")
            return client
        except Exception as e:
            print(f"❌ MLflow not ready yet: {e}")
            time.sleep(5)

def seed_models():
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    client = wait_for_mlflow()
    
    # Ensure experiment exists
    experiment_name = "Seeding"
    experiment = client.get_experiment_by_name(experiment_name)
    if experiment:
        experiment_id = experiment.experiment_id
    else:
        experiment_id = client.create_experiment(experiment_name)
    
    if not os.path.exists(MODELS_DIR):
        print(f"⚠️ Models directory {MODELS_DIR} not found.")
        return

    # Iterate over subdirectories in MODELS_DIR
    for model_name in os.listdir(MODELS_DIR):
        model_path = os.path.join(MODELS_DIR, model_name)
        if not os.path.isdir(model_path):
            continue
            
        print(f"🔍 Checking model: {model_name}")
        
        # Check if registered model exists
        try:
            registered_models = client.get_registered_model(model_name)
            if registered_models:
                print(f"⏭️ Model {model_name} already exists. Skipping.")
                continue
        except Exception:
            pass # Model doesn't exist or error searching
            
        print(f"🚀 Seeding model {model_name}...")
        
        try:
            with mlflow.start_run(experiment_id=experiment_id, run_name=f"Seed {model_name}") as run:
                # Log artifacts
                # We log the contents of the model directory to "model" artifact path
                mlflow.log_artifacts(model_path, artifact_path="model")
                
                # Register model
                model_uri = f"runs:/{run.info.run_id}/model"
                mlflow.register_model(model_uri, model_name)
                
                # Transition to Production
                client.transition_model_version_stage(
                    name=model_name,
                    version=1,
                    stage="Production"
                )
                
            print(f"✅ Model {model_name} seeded successfully!")
            
        except Exception as e:
            print(f"❌ Failed to seed model {model_name}: {e}")

if __name__ == "__main__":
    seed_models()
