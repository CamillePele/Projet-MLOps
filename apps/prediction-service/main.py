import os
import json
import time
import random
from typing import Dict, Any
import pika
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configuration
RABBITMQ_URL = os.getenv('RABBITMQ_URL', 'amqp://guest:guest@localhost:5672')
PREDICTION_QUEUE = os.getenv('RABBITMQ_PREDICTION_QUEUE', 'prediction_queue')
RESULT_QUEUE = os.getenv('RABBITMQ_RESULT_QUEUE', 'prediction_result_queue')
MODEL_NAME = os.getenv('MODEL_NAME', 'default_model')


class PredictionService:
    def __init__(self):
        """Initialize the prediction service"""
        self.connection = None
        self.channel = None
        self.setup_connection()

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

    def generate_fake_prediction(self, image_id: str, image_data: str) -> Dict[str, Any]:
        """
        Generate fake prediction results for testing
        
        Args:
            image_id: ID of the image
            image_data: Base64 encoded image data
            
        Returns:
            Dictionary containing prediction results
        """        
        # Simulate processing time
        # time.sleep(random.uniform(0.5, 2.0))
        
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
            model_name = request.get('modelName', MODEL_NAME)
                        
            # Validate required fields
            if not image_id or not image_data:
                raise ValueError(f"Missing required fields: imageId={image_id}, imageData={'present' if image_data else 'missing'}")
            
            # Generate fake prediction
            prediction_result = self.generate_fake_prediction(image_id, image_data)
            
            # Prepare response
            response_data = {
                'imageId': image_id,
                'modelName': model_name,
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
                    'modelName': request.get('modelName', MODEL_NAME),
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
