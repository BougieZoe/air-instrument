#!/bin/zsh

# 禁用光标，清屏
printf "\e[?25l"
clear

# 定义颜色：绿、青、蓝、紫、白
colors=('\033[32m' '\033[36m' '\033[34m' '\033[35m' '\033[37m')

# 捕获 Ctrl+C，退出时恢复光标
trap 'printf "\e[?25h"; clear; exit' INT

# 获取屏幕宽高
cols=$(tput cols)
lines=$(tput lines)

# 核心循环
while true; do
    # 随机选一列，随机选一种颜色
    col=$((RANDOM % cols))
    color=${colors[$((RANDOM % 5 + 1))]}
    
    # 随机生成一个长度为 5 到 15 的代码流
    len=$((RANDOM % 10 + 5))
    
    for ((i=0; i<len; i++)); do
        # 计算行号
        row=$((i % lines))
        
        # 随机字符
        char_list="X01Z8A@#$*&%ZOE"
        char=${char_list:$((RANDOM % 14)):1}
        
        # 移动光标并打印 (坐标格式: \033[行;列H)
        printf "\033[$((row + 1));${col}H${color}${char}\033[0m"
        
        # 极速刷新感
        sleep 0.001
    done
    
    # 间歇性在屏幕随机位置炸出 "ZOE INVITED"
    if (( RANDOM % 20 == 0 )); then
        r_row=$((RANDOM % lines + 1))
        r_col=$((RANDOM % (cols - 20) + 1))
        printf "\033[${r_row};${r_col}H\033[1;37;41m ZOE: INVITED TO EBE PLANET \033[0m"
    fi
done
