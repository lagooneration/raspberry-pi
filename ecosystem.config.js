module.exports = {
  apps: [
    {
      name: 'endustryai-scale',
      script: 'backend/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/output.log',
      merge_logs: true,
    },
    {
      name: 'endustryai-backup',
      script: 'backend/backup.js',
      instances: 1,
      autorestart: true,
      watch: false,
      cron_restart: '0 0 * * *', // Run backup at midnight
      env: {
        NODE_ENV: 'production',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/backup-error.log',
      out_file: 'logs/backup-output.log',
      merge_logs: true,
    },
  ],
}; 