#!/bin/zsh

# 颜色配置
GREEN='\033[0;32m'
RED='\033[1;31m'
WHITE='\033[1;37m'
CYAN='\033[0;36m'
NC='\033[0m'

# 1. 模拟入侵警报
clear
echo -e "${RED}⚠️  WARNING: UNAUTHORIZED NEURAL LINK DETECTED${NC}"
sleep 0.5
echo -e "${RED}⚠️  SIGNAL SOURCE: UNKNOWN (EXTRATERRESTRIAL ORIGIN)${NC}"
sleep 1
clear

# 2. 随机代码降落函数
function drop_code() {
    local chars="0123456789ABCDEFHIJKLMNOPQRSTUVWXYZ#&*@$+-<>"
    local width=$(tput cols)
    local height=$(tput lines)
    
    # 运行 5 秒的代码雨
    for i in {1..100}; do
        local x=$((RANDOM % width))
        local color_code=$((RANDOM % 2 == 0 ? 32 : 36)) # 绿色或青色
        printf "\033[${color_code}m\033[%d;%dH%s\033[0m" $((RANDOM % height)) $x "${chars:$((RANDOM % ${#chars})):1}"
        if (( i % 10 == 0 )); then sleep 0.02; fi
    done
}

# 3. 强行切断并显示邀请
drop_code
clear

# 获取屏幕中心位置
rows=$(tput lines)
cols=$(tput cols)
text="ZOE, WE INVITE YOU TO BE A GUEST ON OUR PLANET."
start_col=$(( (cols - ${#text}) / 2 ))
start_row=$(( rows / 2 ))

# 模拟打字机效果显示邀请词
printf "\033[%d;%dH" $start_row $start_col
echo -ne "${WHITE}"
for (( i=0; i<${#text}; i++ )); do
    echo -ne "${text:$i:1}"
    sleep 0.1
done
echo -ne "${NC}"

# 4. 底部闪烁提示
printf "\033[%d;%dH" $((start_row + 2)) $(( (cols - 26) / 2 ))
echo -e "${CYAN}[SIGNAL ENCRYPTED BY EBE]${NC}"

# 保持 5 秒后恢复
sleep 5
echo -e "\n\n"
