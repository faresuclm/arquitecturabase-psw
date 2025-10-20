const fs = require("fs");
const express = require("express");
const app = express();
const modelo = require("./servidor/modelo.js");
const PORT = process.env.PORT || 3000;
app.use(express.static(__dirname + "/"));
app.get("/", function (request, response) {
  var contenido = fs.readFileSync(__dirname + "/cliente/index.html");
  response.setHeader("Content-type", "text/html");
  response.send(contenido);
  module.exports.Sistema = sistema;
});
app.listen(PORT, () => {
  console.log(`App está escuchando en el puerto ${PORT}`);
  console.log("Ctrl+C para salir");
});
