const express = require('express');
const fetch = require('node-fetch'); // Si no lo tienes instalado, usa: npm install node-fetch@2
const app = express();
const PORT = 8080;

// URL del backend desde donde se obtendrá la información
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Ruta para la página principal
app.get('/', (req, res) => {
    res.send(`
        <h1>Busca un Pokémon</h1>
        <form method="GET" action="/pokemon">
            <input type="text" name="name" placeholder="Nombre del Pokémon" required>
            <button type="submit">Buscar</button>
        </form>
    `);
});

// Ruta para consumir el backend y mostrar la información
app.get('/pokemon', async (req, res) => {
    const pokemonName = req.query.name; // Obtiene el nombre del Pokémon desde el formulario

    try {
        // Llama al backend
        const response = await fetch(`${BACKEND_URL}/pokemon/${pokemonName}`);
        const data = await response.json();

        // Muestra la información del Pokémon en el navegador
        res.send(`
            <h1>Información de ${data.name}</h1>
            <img src="${data.sprites}" alt="${data.name}">
            <p>Altura: ${data.height}</p>
            <p>Peso: ${data.weight}</p>
            <a href="/">Buscar otro Pokémon</a>
        `);
    } catch (error) {
        console.error('Error al consumir el back:', error);
        res.send(`
            <h1>Error: Pokémon no encontrado</h1>
            <a href="/">Volver a buscar</a>
        `);
    }
});

// Inicia el servidor del frontend
app.listen(PORT, () => {
    console.log(`Frontend corriendo en http://localhost:${PORT}`);
    console.log(`Conectado al backend en: ${BACKEND_URL}`);
});
