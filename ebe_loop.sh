#!/bin/zsh

# 颜色
GREEN='\033[0;32m'
RED='\033[1;31m'
WHITE='\033[1;37m'
CYAN='\033[0;36m'
NC='\033[0m'

# 隐藏光标
printf "\e[?25l"

# 捕获退出信号（按 Ctrl+C 恢复光标）
trap 'printf "\e[?25h"; exit' INT

while true; do
    clear
    # 1. 模拟信号干扰
    for i in {1..3}; do
        echo -e "${RED}  --- INCOMING EBE SIGNAL: ATTEMPT $i ---  ${NC}"
        sleep 0.2
        clear
        sleep 0.1
    done

    # 2. 隐隐若现的 EBE 头像 (字符画)
    echo -e "${GREEN}"
    echo "          .  .        "
    echo "        ..-..        "
    echo "       / 0 0 \       "
    echo "      |   ^   |      "
    echo "       \  -  /       "
    echo "        '---'        "
    echo -e "${NC}"
    sleep 0.5

    # 3. 疯狂的代码雨降落
    local width=$(tput cols)
    local height=$(tput lines)
    for i in {1..150}; do
        local x=$((RANDOM % width))
        printf "\033[32m\033[%d;%dH%s\033[0m" $((RANDOM % height)) $x "${chars:$((RANDOM % 10)):1}"
        (( i % 15 == 0 )) && sleep 0.01
    done

    # 4. 巨型字体 ZOE 邀请函 (用字符拼出大字)
    clear
    echo -e "${CYAN}"
    echo "  ███████╗ ██████╗ ███████╗"
    echo "  ╚══███╔╝██╔═══██╗██╔════╝"
    echo "    ███╔╝ ██║   ██║█████╗  "
    echo "   ███╔╝  ██║   ██║██╔══╝  "
    echo "  ███████╗╚██████╔╝███████╗"
    echo "  ╚══════╝ ╚═════╝ ╚══════╝"
    echo -e "${WHITE}"
    echo "  WE INVITE YOU TO OUR PLANET"
    echo -e "${NC}"
    
    sleep 3  # 停留3秒展示
done
