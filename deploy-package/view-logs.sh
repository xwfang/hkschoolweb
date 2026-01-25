#!/bin/bash
echo ">>> 1. 容器运行状态 (Container Status)"
docker ps -a -f name=hkschoolweb

echo -e "\n>>> 2. 最近 50 条日志 (Recent Logs)"
docker logs --tail 50 hkschoolweb

echo -e "\n>>> 3. 实时日志监控 (按 Ctrl+C 退出)"
echo "正在进入实时日志模式..."
docker logs -f hkschoolweb
