import app from './app.js'
import { serverEnv } from './config/env.js'

app.listen(serverEnv.port, () => {
  console.info(`API server listening on http://127.0.0.1:${serverEnv.port}`)
})
