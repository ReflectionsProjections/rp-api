import express from 'express'

const app = express()

app.get('/hello', (_, res) => {
    return res.send('Hello Vite + TypeScript!');
})

app.listen(3000, () =>
    console.log('Server is listening on port 3000...')
)
