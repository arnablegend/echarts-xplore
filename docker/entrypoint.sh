USER_ID=${LOCAL_USER_ID:-9001}
USERENV="PATH=${PATH} LD_LIBRARY_PATH=${LD_LIBRARY_PATH} PYTHONPATH=${PYTHONPATH}"
USERNAME=user
HOME_DIR=/home/$USERNAME

echo "Starting container with user ID : $USER_ID"

if [ ! $USER_ID -eq 0 ]; then
    if [ ! -e $HOME_DIR ]; then
        mkdir -p $HOME_DIR
    fi

    getent passwd $USER_ID > /dev/null 2>&1
    result=$?

    if [ ! $result -eq 0 ]; then
        echo "Create new uid"
        useradd --shell /bin/bash -u $USER_ID -o -M -c "" -d $HOME_DIR $USERNAME
        echo "$USERNAME ALL=(ALL) NOPASSWD: ALL" >> /etc/sudoers
        chown -R $USERNAME $HOME_DIR
    fi

    chmod 775 $HOME_DIR
    export HOME=$HOME_DIR
    if [ -f /usr/local/bin/.bashrc ]; then
        mv /usr/local/bin/.bashrc $HOME_DIR/
        chown -R $USERNAME $HOME_DIR
    fi
    updatedb

    cd $HOME
    sudo -E -u $USERNAME /usr/bin/env ${USERENV} "$1"
else
    exec "$1"
fi
