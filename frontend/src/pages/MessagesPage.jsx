import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { jwtDecode } from "jwt-decode";

function MessagesPage() {
    const [threads, setThreads] = useState([]);
    const [currentUser, setCurrentUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const token = localStorage.getItem('authToken');

    useEffect(() => {
        if (token) {
            const decodedToken = jwtDecode(token);
            setCurrentUser({ id: decodedToken.sub });
        }

        const fetchThreads = async () => {
            if (!token) {
                setLoading(false);
                setError("You must be logged in to view messages.");
                return;
            }
            try {
                setLoading(true);
                const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/threads`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Could not fetch your conversations.');
                }
                const data = await response.json();
                setThreads(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchThreads();
    }, [token]);

    const getOtherParticipant = (thread) => {
        if (!currentUser) return null;
        return thread.buyer_id === currentUser.id ? thread.seller : thread.buyer;
    };

    if (loading) return <div className="spinner container"></div>;
    if (error) return <p className="error-message container">{error}</p>;

    return (
        <div className="container">
            <h1>Your Conversations</h1>
            <div className="threads-list">
                {threads.length === 0 ? (
                    <p>You have no messages yet.</p>
                ) : (
                    threads.map(thread => {
                        const otherPerson = getOtherParticipant(thread);
                        return (
                            <Link to={`/thread/${thread.id}`} key={thread.id} className="thread-card">
                                <div className="thread-card-info">
                                    <h3>{thread.listing.title}</h3>
                                    {otherPerson && <p>Conversation with {otherPerson.name}</p>}
                                </div>
                                <span className="thread-card-arrow">&rarr;</span>
                            </Link>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default MessagesPage;