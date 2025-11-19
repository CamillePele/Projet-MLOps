"""
Test script to send a fake prediction request directly to RabbitMQ
"""
import pika
import json
import uuid

# Configuration
RABBITMQ_URL = 'amqp://guest:guest@localhost:5672'
PREDICTION_QUEUE = 'prediction_queue'

def send_test_prediction():
    """Send a test prediction request"""
    # Create fake request
    request = {
        'imageId': str(uuid.uuid4()),
        'imagePath': '/fake/path/to/image.jpg',
        'modelName': 'test_model'
    }
    
    print(f"📤 Sending test prediction request:")
    print(f"   Image ID: {request['imageId']}")
    print(f"   Image Path: {request['imagePath']}")
    print(f"   Model: {request['modelName']}")
    
    # Connect to RabbitMQ
    parameters = pika.URLParameters(RABBITMQ_URL)
    connection = pika.BlockingConnection(parameters)
    channel = connection.channel()
    
    # Declare queue
    channel.queue_declare(queue=PREDICTION_QUEUE, durable=True)
    
    # Send message
    channel.basic_publish(
        exchange='',
        routing_key=PREDICTION_QUEUE,
        body=json.dumps(request),
        properties=pika.BasicProperties(
            delivery_mode=2,  # Make message persistent
            content_type='application/json'
        )
    )
    
    print(f"✅ Test request sent successfully!")
    print(f"   Check the prediction service logs for the result")
    
    # Close connection
    connection.close()

if __name__ == '__main__':
    print("=" * 60)
    print("🧪 RabbitMQ Test - Send Prediction Request")
    print("=" * 60)
    print()
    
    try:
        send_test_prediction()
    except Exception as e:
        print(f"❌ Error: {e}")
        print("   Make sure RabbitMQ is running: docker-compose up -d rabbitmq")
