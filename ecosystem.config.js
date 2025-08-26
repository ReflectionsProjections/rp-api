// pm2 configuration
export default {
    apps: [
        {
            name: "RP_API",
            script: "build/src/app.js",
            wait_ready: true,
            instances: 2,
            listen_timeout: 10 * 1000,
            out_file: "$HOME/.pm2/logs/api_out.log",
            err_file: "$HOME/.pm2/logs/api_err.log",
            combine_logs: true,
        },
    ],
};
