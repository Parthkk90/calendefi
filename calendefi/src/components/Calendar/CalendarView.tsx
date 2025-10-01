import React, { useEffect, useState } from 'react';
import { fetchCalendarEvents } from '../../services/google/calendarAPI';
import { CalendarEvent } from '../../types/calendar';

const CalendarView: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const getEvents = async () => {
            try {
                const fetchedEvents = await fetchCalendarEvents();
                setEvents(fetchedEvents);
            } catch (err) {
                setError('Failed to fetch events');
            } finally {
                setLoading(false);
            }
        };

        getEvents();
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>{error}</div>;
    }

    return (
        <div>
            <h2>Your Google Calendar Events</h2>
            <ul>
                {events.map((event) => (
                    <li key={event.id}>
                        <h3>{event.title}</h3>
                        <p>{event.description}</p>
                        <p>{new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}</p>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default CalendarView;