const express = require('express');
const router = express.Router();
const redis = require('../redisClient');
const Message = require('../Models/Message'); // Asegúrate de que este modelo exista

const STREAM_NAME = 'messages';
const clients = {};

class Client {
    constructor(clientId, name) {
        this.clientId = clientId;
        this.name = name;
        this.createdAt = new Date();
    }
}

router.post('/stream/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const { message, userId } = req.body;

    if (!message) return res.status(400).json({ error: 'Message is required' });

    try {
        await redis.xadd(
            STREAM_NAME,
            '*',
            'clientId', clientId,
            'userId', userId || '',
            'message', message
        );
        console.log(`[POST] ${clientId}:`, message);
        res.status(200).json({ status: 'ok' });
    } catch (err) {
        console.error('[POST] Redis error:', err);
        res.status(500).json({ error: 'Failed to add message to stream' });
    }
});

router.get('/events/:clientId', async (req, res) => {
    const { clientId } = req.params;
    const fromId = req.query.fromId;
    let lastId = fromId;

    if (!clients[clientId]) {
        clients[clientId] = new Client(clientId, `Client ${clientId}`);
        console.log(`Registered new client: ${clientId}`);
    } else {
        console.log(`Client ${clientId} already registered`);
    }

    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
    });
    res.flushHeaders();

    const keepAlive = setInterval(() => res.write(':\n\n'), 15000);
    let running = true;

    const send = (id, data) => {
        const msg = new Message(id, data.clientId, data.userId, data.message);
        res.write(`data: ${JSON.stringify(msg)}\n\n`);
    };

    const loop = async () => {
        while (running) {
            try {
                const response = await redis.xread(
                    'BLOCK', 10,
                    'COUNT', 10,
                    'STREAMS', STREAM_NAME,
                    lastId
                );

                if (response) {
                    const [_, messages] = response[0];
                    for (const [id, fields] of messages) {
                        const data = {};
                        for (let i = 0; i < fields.length; i += 2) {
                            data[fields[i]] = fields[i + 1];
                        }

                        // Only show messages for that clientId
                        if (data.clientId === clientId) {
                            send(id, data);
                        }

                        lastId = id;
                    }
                }
            } catch (err) {
                res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
            }
        }
    };

    req.on('close', () => {
        running = false;
        clearInterval(keepAlive);
        res.end();
    });

    loop();
});


module.exports = router;
