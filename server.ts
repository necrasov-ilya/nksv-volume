import app from './src/app.js';
import { config } from './src/config.js';

app.listen(config.port, () => {
  console.log(`nksv-volume running on http://localhost:${config.port}`);
});
