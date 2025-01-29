const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 8080;

// URL del backend desde una variable de entorno
const BACKEND_URL = process.env.BACKEND_URL || 'http://backend:3000';

// Endpoint de salud requerido por Kubernetes
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Página principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Busca un Pokémon</h1>
        <form method="GET" action="/pokemon">
            <input type="text" name="name" placeholder="Nombre del Pokémon" required>
            <button type="submit">Buscar</button>
        </form>
    `);
});

// Ruta para consumir el backend
app.get('/pokemon', async (req, res) => {
    const pokemonName = req.query.name;

    try {
        const response = await fetch(`${BACKEND_URL}/pokemon/${pokemonName}`);
        const data = await response.json();

        res.send(`
            <h1>${data.message}</h1>
        `);
    } catch (error) {
        console.error('Error al consumir el backend:', error);
        res.send(`<h1>Error: Pokémon no encontrado</h1><a href="/">Volver a buscar</a>`);
    }
});

// Iniciar servidor en 0.0.0.0
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Frontend corriendo en http://0.0.0.0:${PORT}`);
    console.log(`Conectado al backend en: ${BACKEND_URL}`);
});
