#!/bin/bash
set -e

echo "Setting up PostgreSQL for Stock App..."
sudo -u postgres psql -c "CREATE USER stock_user WITH PASSWORD 'stock_pass_123';" || true
sudo -u postgres psql -c "CREATE DATABASE stock_db OWNER stock_user;" || true
sudo -u postgres psql -c "ALTER ROLE stock_user SET client_encoding TO 'utf8';" || true

echo "Cloning repository..."
cd /home/ubuntu
if [ -d "stock-software" ]; then
  rm -rf stock-software
fi
git clone https://github.com/vaugustin250/stock-software.git

echo "Setting up Backend..."
cd /home/ubuntu/stock-software/server
cat <<EOT > .env
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=stock_user
DB_PASSWORD=stock_pass_123
DB_NAME=stock_db
PORT=5001
JWT_SECRET=supersecretjwtkey_stock
EOT
npm install
npx knex migrate:latest
pm2 stop stock-api || true
pm2 start src/index.js --name "stock-api"

echo "Setting up Frontend..."
cd /home/ubuntu/stock-software/client
cat <<EOT > .env
VITE_API_URL=http://api-stock.13.51.56.10.nip.io
EOT
npm install
npm run build

echo "Configuring Nginx..."
cat <<EOF | sudo tee /etc/nginx/sites-available/stock-app
server {
    listen 80;
    server_name stock.13.51.56.10.nip.io;

    root /home/ubuntu/stock-software/client/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}

server {
    listen 80;
    server_name api-stock.13.51.56.10.nip.io;

    location / {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/stock-app /etc/nginx/sites-enabled/
sudo systemctl reload nginx

echo "Setup script completed. Access your app at http://stock.13.51.56.10.nip.io"
