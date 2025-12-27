from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from pymongo import MongoClient

app = Flask(__name__)
socketio = SocketIO(app)

# Connect to MongoDB
client = MongoClient("mongodb://192.168.0.86:27017/")
db = client.agent_database
AgentsCollection = db.agents

# Endpoint to add a voice assistant
@app.route('/voice_assistant', methods=['POST'])
def add_voice_assistant():
    data = request.get_json()
    AgentsCollection.insert_one({"type": "voice_assistant", "data": data})
    return jsonify({"message": "Voice assistant initialized!", "data": data}), 201

# Endpoint for prompting agent initialization
@app.route('/prompting_agent', methods=['POST'])
def add_prompting_agent():
    data = request.get_json()
    AgentsCollection.insert_one({"type": "prompting_agent", "data": data})
    return jsonify({"message": "Prompting agent initialized!", "data": data}), 201

# Endpoint to retrieve all agents
@app.route('/agents', methods=['GET'])
def get_agents():
    agents = list(AgentsCollection.find())
    return jsonify(agents), 200

@socketio.on('message')
def handle_message(msg):
    socketio.send(msg)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=8000)  # Set to run on port 8000