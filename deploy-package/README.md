# 部署指南

本目录包含了部署前端应用所需的所有文件。

## 目录结构
- `html/`: 前端静态资源 (构建产物)
- `docker compose.yml`: Docker 编排文件
- `nginx.conf`: Nginx 配置文件
- `deploy.sh`: 自动部署脚本
- `view-logs.sh`: 查看日志脚本

## 快速部署

### 前置条件
1. 目标服务器已安装 `Docker` 和 `Docker Compose`。
2. 本地可以通过 SSH 连接到服务器 (建议配置 SSH Key 免密登录)。
3. 如果是首次部署，确保服务器防火墙开放了 80 端口。

### 方式一：使用自动脚本 (推荐)

在 `deploy-package` 目录下运行：

```bash
# 添加执行权限
chmod +x deploy.sh

# 默认部署到 101.47.72.93
./deploy.sh

# 或者指定 IP
./deploy.sh <服务器IP>
```

脚本会自动完成：
1. 创建远程目录 (`/opt/hkschoolweb`)
2. 上传文件
3. 重启 Docker 服务

### 方式二：手动部署

1. **上传文件**
   将本目录下的所有文件上传到服务器 (例如 `/opt/hkschoolweb`)。
   ```bash
   scp -r deploy-package/* root@<服务器IP>:/opt/hkschoolweb/
   ```

2. **启动服务**
   登录服务器并进入目录：
   ```bash
   ssh root@<服务器IP>
   cd /opt/hkschoolweb
   docker-compose down
   docker-compose up -d
   ```

## 维护操作

- **查看日志**: 运行 `./view-logs.sh` (在服务器上) 或使用 `docker-compose logs -f`。
- **更新配置**: 修改 `nginx.conf` 后运行 `docker-compose restart`。

## 配置说明
- **后端地址**: 修改 `nginx.conf` 中的 `proxy_pass` 地址 (默认为 `http://150.109.69.62:8080/api/`)。
- **端口**: 修改 `docker-compose.yml` 中的 `ports` 映射 (默认为 `80:80`)。
