#!/bin/bash

# key/cert name
srvkey='proxy/.node.http.tunnel.ecdsa.prime256v1'

# images
imgc='mulekick/tunnel-client:latest'
imgr='mulekick/tunnel-remote:latest'
imgp='mulekick/tunnel-proxy:latest'

# bridge networks
internet='ntw-internet'
local='ntw-local'

# remote host, proxy, clients containers names
remote='cnt-remote'
proxy='cnt-proxy'
client1='cnt-client-1'
client2='cnt-client-2'

# tmux session name
sname="tunnel-session"

# create SSL/TLS 1.3 configuration 
if [[ $1 = 'tls' ]]; then

    # create server private key
    openssl ecparam -param_enc named_curve -name prime256v1 -genkey -noout -outform PEM -out "$srvkey" && \
    # create server certificate
    openssl req -x509 -key "$srvkey" -new -outform PEM -out "$srvkey.crt" -verbose

# build containers
elif [[ $1 = 'build' ]]; then

    # build client, remote and proxy images
    docker build -t $imgc client/.
    docker build -t $imgr remote/.
    docker build -t $imgp proxy/.

# start service
elif [[ $1 = 'start' ]]; then

    if [[ $# -lt 2 ]]; then
        echo "please provide client and remote host running mode (tcp or http)"
        # failure
        return 1

    else

        # create networks
        echo "creating networks ..."
        docker network create -d bridge "$internet" && \
        docker network create -d bridge "$local" && \
        echo "networks creation completed ..."

        # start containers (use -t to allocate a pseudo-TTY and have the colors in the docker logs commands)
        if [[ $3 = 'debug' ]]; then

            # setup remote host and proxy containers - debug mode
            echo "creating remote and reverse proxy containers ..." && \
            docker run --name "$remote"  --rm -t -d --env MODE="$2" --env DEBUG=1 -p 9221:9229 "$imgr" && \
            docker run --name "$proxy"   --rm -t -d --env MODE="$2" --env DEBUG=1 -p 9220:9229 "$imgp" && \
            echo "connecting to networks ..." && \
            docker network connect "$local" "$remote" && \
            docker network connect "$local" "$proxy" && \
            docker network connect "$internet" "$proxy" && \
            # setup clients containers - debug mode
            echo "creating client containers ..." && \
            docker run --name "$client1" --rm -t -d --env PROXY="$proxy" --env REMOTE="$remote" --env DEBUG=1 -p 9219:9229 "$imgc" && \
            docker run --name "$client2" --rm -t -d --env PROXY="$proxy" --env REMOTE="$remote" --env DEBUG=1 "$imgc" && \
            echo "connecting to networks ..." && \
            docker network connect "$internet" "$client1" && \
            docker network connect "$internet" "$client2" && \
            echo "setup completed ..."

        else

            # setup remote host and proxy containers
            echo "creating remote and reverse proxy containers ..." && \
            docker run --name "$remote"  --rm -t -d --env MODE="$2" "$imgr" && \
            docker run --name "$proxy"   --rm -t -d --env MODE="$2" "$imgp" && \
            echo "connecting to networks ..." && \
            docker network connect "$local" "$remote" && \
            docker network connect "$local" "$proxy" && \
            docker network connect "$internet" "$proxy" && \
            # setup clients containers
            echo "creating client containers ..." && \
            docker run --name "$client1" --rm -t -d --env PROXY="$proxy" --env REMOTE="$remote" "$imgc" && \
            docker run --name "$client2" --rm -t -d --env PROXY="$proxy" --env REMOTE="$remote" "$imgc" && \
            echo "connecting to networks ..." && \
            docker network connect "$internet" "$client1" && \
            docker network connect "$internet" "$client2" && \
            echo "setup completed ..."

        fi

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
        tmux send-keys -t "$winid.0" "clear && docker logs -f $remote" C-m
        tmux send-keys -t "$winid.1" "clear && docker logs -f $proxy" C-m
        tmux send-keys -t "$winid.2" "clear && docker logs -f $client1" C-m
        tmux send-keys -t "$winid.3" "clear && docker logs -f $client2" C-m
        
        # attach session to current terminal
        tmux attach-session -t "$sname"

    fi

# stop service
elif [[ $1 = 'stop' ]]; then

    # remove clients, remote and proxy containers
    echo "removing client containers ..." && \
    docker container rm -f "$client1" "$client2" && \
    echo "removing remote and reverse proxy containers ..." && \
    docker container rm -f "$remote" "$proxy" && \
    echo "removing networks ..." && \
    docker network rm "$internet" "$local" && \
    echo "exiting ..."
    
    # kill tmux session
    tmux detach-client -s "$sname" && tmux kill-session -t "$sname"

else

    echo "no command could be executed"
    # failure
    return 1

fi

# success
return 0