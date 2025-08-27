// pm2 configuration
module.exports = {
    apps: [
        {
            name: "RP_API",
            script: "build/src/app.js",
            wait_ready: true,
            instances: 2,
            listen_timeout: 10 * 1000,
            out_file: "/home/ubuntu/.pm2/logs/api_out.log",
            err_file: "/home/ubuntu/.pm2/logs/api_err.log",
            combine_logs: true,
            log_date_format: "YYYY-MM-DD HH:mm:ss.SSS",
        },
    ],
};
