#!/usr/bin/env python3
"""
Quick start script for the prediction service
"""
import subprocess
import sys
import os

def check_venv():
    """Check if running in virtual environment"""
    return hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)

def main():
    if not check_venv():
        print("⚠️  Warning: Not running in a virtual environment")
        print("   Consider creating one with: python -m venv venv")
        print("   And activating it before running this script\n")
    
    # Check if requirements are installed
    try:
        import pika
        import dotenv
    except ImportError:
        print("📦 Installing dependencies...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Run the service
    print("\n🚀 Starting prediction service...\n")
    from main import main as service_main
    service_main()

if __name__ == '__main__':
    main()
