#!/bin/bash

# kill-dev-ports.sh
# Kills processes using development ports (5173 for desktop, 3000 for web, 1420 for Tauri)

echo -e "\033[33mKilling processes on dev ports...\033[0m"

ports=(5173 3000 1420)  # 5173=Vite desktop, 3000=Web, 1420=Tauri dev server

for port in "${ports[@]}"; do
    # Find processes using the port
    pids=$(lsof -ti:$port 2>/dev/null)
    
    if [ ! -z "$pids" ]; then
        for pid in $pids; do
            # Get process name
            process_name=$(ps -p $pid -o comm= 2>/dev/null)
            if [ ! -z "$process_name" ]; then
                echo -e "  \033[36mKilling $process_name (PID: $pid) on port $port\033[0m"
                kill -9 $pid 2>/dev/null
            fi
        done
    fi
done

# Small delay to ensure ports are released
sleep 0.5

echo -e "\033[32mDev ports cleared.\033[0m"
echo ""
