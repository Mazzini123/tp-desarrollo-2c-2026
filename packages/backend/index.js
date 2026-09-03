import "dotenv/config";
import app from "./src/app.js";

const port = process.env.SERVER_PORT || 8000;

app.listen(port, () => {
  console.log(`Backend escuchando en http://localhost:${port}`);
});
