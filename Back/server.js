const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Endpoint de salud requerido por Kubernetes
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Ruta para consumir PokéAPI
app.get('/pokemon/:name', async (req, res) => {
    const { name } = req.params;

    try {
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const pokemonData = response.data;

        res.json({
            name: pokemonData.name,
            height: pokemonData.height,
            weight: pokemonData.weight,
            sprites: pokemonData.sprites.front_default,
        });
    } catch (error) {
        console.error(error.message);
        res.status(404).json({ error: 'Pokémon no encontrado' });
    }
});

// Iniciar servidor en 0.0.0.0 para que Kubernetes lo detecte
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend corriendo en http://0.0.0.0:${PORT}`);
});
