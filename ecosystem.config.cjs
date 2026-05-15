module.exports = {
  apps: [
    {
      name: 'hub-backend',
      script: 'src/index.js',
      interpreter: 'node',
      interpreter_args: '--env-file=.env',

      // Cluster para aproveitar CPUs (zero-downtime com pm2 reload)
      instances: 1,
      exec_mode: 'fork',

      // Evita restart loop: só conta crash se morrer antes de 10s
      min_uptime: '10s',
      max_restarts: 5,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,

      // Reinicia se vazar memória (evita OOM no VPS)
      max_memory_restart: '400M',

      // Logs
      error_file: '/home/ubuntu/.pm2/logs/hub-backend-error.log',
      out_file: '/home/ubuntu/.pm2/logs/hub-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Ambiente de produção
      env_production: {
        NODE_ENV: 'production',
        PORT: 3002,
        HOST: '0.0.0.0',
      },
    },
  ],
};
