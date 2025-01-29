const express = require('express');
const axios = require('axios');

const app = express();
const PORT = 3000;

// Ruta para consumir PokéAPI
app.get('/pokemon/:name', async (req, res) => {
    const { name } = req.params; // Obtiene el nombre del Pokémon desde la URL

    try {
        // Realiza una solicitud a la API de PokéAPI
        const response = await axios.get(`https://pokeapi.co/api/v2/pokemon/${name}`);
        const pokemonData = response.data;

        // Devuelve solo los datos relevantes al frontend
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

// Inicia el servidor
app.listen(PORT, '0.0.0.0',() => {
    console.log(`Backend corriendo en http://0.0.0.0:${PORT}`);
});

app.get('/healt',(req, res) => {
    res.status(200).json({status:'ok'})
});
