# AIXSphere Backend

## Overview

This is the backend for the AIXSphere Agent, built using Flask and MongoDB.

## Prerequisites

- Python 3.x
- MongoDB instance running on 192.168.0.86:27017

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows use `venv\Scripts\activate`
Install dependencies:

pip install -r requirements.txt
Start the Flask application:

python app.py
WebSocket Communication
The backend supports real-time communication using Socket.IO.