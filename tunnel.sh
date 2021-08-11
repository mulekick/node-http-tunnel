#!/bin/bash

# tmux session name
sname="http-tunnel-input"
# remote host command, redirect stderr to stdout
rcommand="node scripts/remote.js $2 2>&1"
# proxy command, redirect stderr to stdout
pcommand="node scripts/proxy.js 2>&1"
# client command
ccommand=". tunnel.sh client-setup $2"
# prefix
prefix="/tmp/client-pipe"
# client named pipe path
cpipe="$prefix-$(( RANDOM ))"
# named pipes pids file
ppids="$prefix-cat-pids"
# shell user invite
invite="you can now write any data to $cpipe to have the client send it ..."

# -------------------------------------------------
# setup tmux session, proxy, remote and client
if [[ $1 = "tunnel-setup" ]]; then
    # init session
    tmux new-session -ds "$sname"
    # extract window id
    winid=$(tmux list-windows -t "$sname" | sed -r 's/^([0-9]):.+$/\1/g' -)
    # set layout
    tmux select-layout -t "$winid.0" even-vertical
    # create 3 more panes
    for pnid in {0..2}; do
        # split current pane
        tmux split-window -v -t "$winid.$pnid"
        # set layout
        tmux select-layout -t "$winid.$(( pnid + 1 ))" even-vertical
    # end while
    done
    # split pane 2 horizontally
    tmux split-window -h -t "$winid.2"
    # send commands
    tmux send-keys -t "$winid.0" "$rcommand" C-m
    tmux send-keys -t "$winid.1" "$pcommand" C-m
    tmux send-keys -t "$winid.2" "$ccommand" C-m
    tmux send-keys -t "$winid.3" "$ccommand" C-m
    # attach session to current terminal
    tmux attach-session -t "$sname"
# -------------------------------------------------
# setup client
elif [[ $1 = "client-setup" ]]; then
    # create named pipe
    mkfifo "$cpipe"
    # start background process to prevent client stdin from receiving EOF
    cat > "$cpipe" &
    # save background process pid for future kill
    echo $! >> "$ppids"
    # print invite ...
    echo "$invite"
    # start foreground node process, redirect stderr to stdout and named pipe to stdin
    node scripts/client.js "$2" 2>&1 < "$cpipe"
# -------------------------------------------------
# exit everything
elif [[ $1 = "tunnel-exit" ]]; then
    # send EOF to named pipe
    kill -s 9 "$(cat $ppids)"
    # cleanup /tmp (no quoting here)
    rm -f $prefix-*
    # kill tmux session
    tmux detach-client -s "$sname" && tmux kill-session -t "$sname"
fi

# success
exit 0