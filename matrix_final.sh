#!/bin/zsh

# 颜色数组：黑客绿、赛博紫、冷酷蓝、警告红、外星青
colors=('\033[0;32m' '\033[0;35m' '\033[0;34m' '\033[0;31m' '\033[0;36m')
WHITE='\033[1;37m'
NC='\033[0m'

# 隐藏光标
printf "\e[?25l"
trap 'printf "\e[?25h"; clear; exit' INT

# 获取终端尺寸
cols=$(tput cols)
lines=$(tput lines)

# 初始化每一列的下降位置
for ((i=0; i<cols; i++)); do
    y[$i]=$((RANDOM % lines))
done

clear

while true; do
    for ((i=0; i<cols; i++)); do
        # 随机选择一种颜色
        color=${colors[$((RANDOM % ${#colors[@]} + 1))]}
        
        # 在当前位置打印随机字符（希腊字母、数字、符号混搭）
        char_list="ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        char=${char_list:$((RANDOM % ${#char_list})),1}
        
        # 移动光标并打印
        printf "\033[%d;%dH${color}${char}${NC}" ${y[$i]} $i
        
        # 打印一个白色的“头”让它看起来像在流动
        printf "\033[%d;%dH${WHITE}${char}${NC}" $((y[$i] + 1)) $i

        # 更新下一帧的位置
        y[$i]=$((y[$i] + 1))
        
        # 如果流到底部，随机重置到顶部
        if [[ ${y[$i]} -gt $lines ]]; then
            y[$i]=1
        fi
    done

    # 间歇性在屏幕中心强行弹出 ZOE 的邀请（每隔一阵闪现一次）
    if (( RANDOM % 50 == 0 )); then
        printf "\033[$((lines/2));$(((cols-40)/2))H${WHITE}             ZOE: INVITED TO EBE PLANET             ${NC}"
        sleep 0.1
    fi

    sleep 0.01
done
