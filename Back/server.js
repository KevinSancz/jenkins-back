const express = require('express');

const app = express();
const PORT = 3000;

// Endpoint de salud requerido por Kubernetes
app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// Ruta para consumir PokéAPI
app.get('/pokemon/:name', async (req, res) => {
    res.json({ message: "Hola" });
});

// Iniciar servidor en 0.0.0.0 para que Kubernetes lo detecte
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend corriendo en http://0.0.0.0:${PORT}`);
});
