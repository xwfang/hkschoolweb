#!/bin/bash

# ==========================================
# 自动部署脚本
# ==========================================

# 默认配置
DEFAULT_IP="150.109.69.62"
REMOTE_USER="root"
REMOTE_DIR="/opt/hkschoolweb"

# 获取参数
SERVER_IP=${1:-$DEFAULT_IP}

echo "🚀 开始部署流程..."
echo "目标服务器: $SERVER_IP"
echo "远程目录: $REMOTE_DIR"
echo "------------------------------------------"

# 确认
read -p "确认开始部署? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 部署取消"
    exit 1
fi

# 确保在脚本所在目录
cd "$(dirname "$0")"

# 1. 检查必要文件
if [ ! -d "html" ]; then
    echo "❌ 错误: html 目录不存在，请先执行构建"
    exit 1
fi

# 2. 创建远程目录
echo "📂 [1/3] 准备远程目录..."
ssh $REMOTE_USER@$SERVER_IP "mkdir -p $REMOTE_DIR"
if [ $? -ne 0 ]; then
    echo "❌ 无法连接到服务器或创建目录失败"
    exit 1
fi

# 3. 上传文件
echo "Cc [2/3] 上传文件..."
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

# 4. 重启服务
echo "🔄 [3/3] 重启服务..."
ssh $REMOTE_USER@$SERVER_IP "cd $REMOTE_DIR && docker-compose down && docker-compose up -d"

echo "------------------------------------------"
echo "✅ 部署完成!"
echo "访问地址: http://$SERVER_IP"
