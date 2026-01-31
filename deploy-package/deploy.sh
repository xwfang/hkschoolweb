#!/bin/bash

# ==========================================
# 自动部署脚本 (增强版)
# ==========================================

# 默认配置
DEFAULT_IP="150.109.69.62"
REMOTE_USER="root"
REMOTE_DIR="/opt/hkschoolweb"
CONTAINER_NAME="hkschoolweb" # 需与 docker-compose.yml 中的 container_name 一致

# 获取参数
SERVER_IP=${1:-$DEFAULT_IP}

# 颜色输出
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO] $1${NC}"
}

log_warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

log_error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

echo -e "🚀 ${GREEN}开始部署流程...${NC}"
echo "目标服务器: $SERVER_IP"
echo "远程目录: $REMOTE_DIR"
echo "------------------------------------------"

# 确认
read -p "确认开始部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log_warn "部署取消"
    exit 1
fi

# 确保在脚本所在目录
cd "$(dirname "$0")"

# 1. 检查必要文件
if [ ! -d "html" ]; then
    log_error "html 目录不存在，请先执行构建"
    exit 1
fi

# 2. 检查服务器连通性
log_info "检查服务器连通性..."
if ! ssh -o ConnectTimeout=5 $REMOTE_USER@$SERVER_IP "echo 'Connection successful'"; then
    log_error "无法连接到服务器 $SERVER_IP，请检查网络或 SSH 配置"
    exit 1
fi

# 3. 创建远程目录
log_info "📂 [1/4] 准备远程目录..."
ssh $REMOTE_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"
if [ $? -ne 0 ]; then
    log_error "创建远程目录失败"
    exit 1
fi

# 4. 上传文件
log_info "Cc [2/4] 上传文件..."
# 使用 rsync 如果可用，否则使用 scp
if command -v rsync &> /dev/null; then
    rsync -avz --delete \
        --exclude '.DS_Store' \
        --exclude 'deploy.sh' \
        --exclude 'README.md' \
        ./ $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/
else
    # scp 不支持 exclude，所以简单全量拷贝
    scp -r * $REMOTE_USER@$SERVER_IP:$REMOTE_DIR/
fi

if [ $? -ne 0 ]; then
    log_error "文件上传失败"
    exit 1
fi

# 5. 重启服务
log_info "🔄 [3/4] 重启服务..."
# 使用 && 连接命令，确保任何一步失败都会被捕获
ssh $REMOTE_USER@$SERVER_IP "cd $REMOTE_DIR && \
    echo 'Stopping existing containers...' && \
    docker-compose down && \
    echo 'Starting new containers...' && \
    docker-compose up -d"

if [ $? -ne 0 ]; then
    log_error "服务重启命令执行失败"
    exit 1
fi

# 6. 健康检查 (关键步骤)
log_info "🏥 [4/4] 执行健康检查..."
echo "等待 5 秒让服务完全启动..."
sleep 5

# 检查容器是否在运行
CONTAINER_STATUS=$(ssh $REMOTE_USER@$SERVER_IP "docker inspect -f '{{.State.Running}}' $CONTAINER_NAME 2>/dev/null")

if [ "$CONTAINER_STATUS" != "true" ]; then
    log_error "容器未在运行! 状态: $CONTAINER_STATUS"
    echo "------------------------------------------"
    log_warn "正在获取容器最后 20 行日志..."
    ssh $REMOTE_USER@$SERVER_IP "docker logs --tail 20 $CONTAINER_NAME"
    echo "------------------------------------------"
    exit 1
fi

# 检查 HTTP 端口是否响应 (可选，依赖 curl)
HTTP_STATUS=$(ssh $REMOTE_USER@$SERVER_IP "curl -s -o /dev/null -w '%{http_code}' http://localhost:80 || echo 'failed'")

if [ "$HTTP_STATUS" == "200" ]; then
    log_info "HTTP 健康检查通过 (HTTP 200)"
else
    log_warn "HTTP 健康检查返回异常状态: $HTTP_STATUS (可能是 Nginx 配置错误或启动延迟)"
    echo "建议手动检查: http://$SERVER_IP"
fi

echo "------------------------------------------"
echo -e "✅ ${GREEN}部署流程完成!${NC}"
echo "访问地址: http://$SERVER_IP"
