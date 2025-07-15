# Docker Deployment (Optional)

If you want to deploy using Docker instead of cloud platforms, you can use the provided Docker configuration.

## Files

- `Dockerfile.optional` - Rename to `Dockerfile` to use
- `docker-compose.yml.optional` - Rename to `docker-compose.yml` to use

## Usage

```bash
# Enable Docker deployment
mv Dockerfile.optional Dockerfile
mv docker-compose.yml.optional docker-compose.yml

# Build and run
docker-compose up -d
```

## Why These Files Are Renamed

To prevent GitHub from automatically trying to build Docker containers (which causes permission errors), these files are renamed with `.optional` suffix.

## Cloud Deployment (Recommended)

For easier deployment, we recommend using:
- **Render** (current deployment): https://xray-dashboard.onrender.com
- **Railway**: Easy auto-deployment from GitHub
- **Heroku**: Popular platform with good documentation

See `CLOUD-DEPLOYMENT.md` for cloud deployment instructions.