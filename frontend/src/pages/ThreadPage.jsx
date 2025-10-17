import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import './ThreadPage.css';

function ThreadPage() {
    const { threadId } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('authToken');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (token) {
            const decodedToken = jwtDecode(token);
            setCurrentUser({ id: decodedToken.sub });
        }

        const fetchMessages = async () => {
            if (!token) {
                setLoading(false);
                setError("You must be logged in to view messages.");
                return;
            }
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/threads/${threadId}/messages`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Could not fetch messages.');
                }
                const data = await response.json();
                setMessages(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchMessages();
    }, [threadId, token]);

    useEffect(() => {
        if (!currentUser) return;

        const wsUrl = import.meta.env.VITE_API_BASE_URL.replace(/^http/, 'ws');
        const ws = new WebSocket(`${wsUrl}/ws/${threadId}`);
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.sender_id !== currentUser.id) {
                setMessages(prevMessages => [...prevMessages, message]);
            }
        };

        return () => {
            ws.close();
        };
    }, [threadId, currentUser]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !token) return;

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/threads/${threadId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ body: newMessage })
            });

            if (!response.ok) {
                throw new Error('Failed to send message.');
            }
            
            const sentMessage = await response.json();
            setMessages(prevMessages => [...prevMessages, sentMessage]);
            setNewMessage('');
        } catch (err) {
            console.error(err.message);
        }
    };

    if (error) return <p className="error-message container">{error}</p>;

    return (
        <div className="container">
            <Link to="/messages" className="back-link">&larr; All Conversations</Link>
            <div className="thread-container">
                <div className="messages-list">
                    {loading ? (
                        <div className="spinner"></div>
                    ) : messages.length === 0 ? (
                        <div className="empty-chat-message">
                            <p>This is the beginning of your conversation.</p>
                            <p>Send a message to get started!</p>
                        </div>
                    ) : (
                        messages.map(msg => {
                            const messageClass = msg.sender_id === currentUser?.id ? 'sent' : 'received';
                            return (
                                <div key={msg.id} className={`message-bubble ${messageClass}`}>
                                    {msg.body}
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form onSubmit={handleSendMessage} className="message-form">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        required
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
}

export default ThreadPage;