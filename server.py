from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room

from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = 'supersecretkey'
socketio = SocketIO(app, cors_allowed_origins="*")

# === Data storage ===
active_users = {}  # { sid: username }
rooms = ["General"]  # Default group


@app.route('/')
def index():
    return render_template("index.html")


# ===== USER JOINS =====
@socketio.on('join')
def handle_join(data):
    user = data.get('user')
    room = data.get('room', 'General')
    sid = request.sid

    active_users[sid] = user
    join_room(room)

    # Send system welcome message to everyone in the room
    emit('message', {
        'user': 'System',
        'text': f'{user} joined the live chat 💬',
        'time': datetime.now().strftime("%H:%M")
    }, room=room)

    # Update user and group list for all clients
    update_user_list()
    emit('group_list', rooms, broadcast=True)


# ===== USER SENDS MESSAGE =====
@socketio.on('send_message')
def handle_message(data):
    room = data.get('room', 'General')
    emit('message', {
        'user': data['user'],
        'text': data['text'],
        'time': datetime.now().strftime("%H:%M")
    }, room=room)


# ===== USER IS TYPING =====
@socketio.on('typing')
def handle_typing(data):
    emit('typing', {'user': data['user']}, room=data['room'], include_self=False)


# ===== CREATE GROUP =====
@socketio.on('create_group')
def handle_create_group(data):
    group = data.get('group')
    if group and group not in rooms:
        rooms.append(group)
        emit('group_list', rooms, broadcast=True)


# ===== PRIVATE CHAT =====
@socketio.on('private_message')
def handle_private(data):
    sender = data['from']
    receiver = data['to']
    text = data['text']

    # Find receiver’s session id
    for sid, name in active_users.items():
        if name == receiver:
            emit('private_message', {
                'from': sender,
                'text': text,
                'time': datetime.now().strftime("%H:%M")
            }, room=sid)
            break


# ===== DISCONNECT =====
@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    user = active_users.get(sid)
    if user:
        del active_users[sid]
        emit('message', {
            'user': 'System',
            'text': f'{user} left the chat ❌',
            'time': datetime.now().strftime("%H:%M")
        }, broadcast=True)
        update_user_list()


# ===== UPDATE ONLINE USERS =====
def update_user_list():
    emit('user_list', list(active_users.values()), broadcast=True)


if __name__ == '__main__':
    import eventlet
    import eventlet.wsgi
    socketio.run(app, host='0.0.0.0', port=10000)

