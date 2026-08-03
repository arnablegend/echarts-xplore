#base image
FROM ubuntu:26.04

USER root
ENV DEVIAN_FRONTEND=noninteractive

# Remove useless ubuntu user hogging 1000 id
RUN userdel ubuntu
RUN apt update --fix-missing
RUN apt install coreutils-from-gnu --allow-remove-essential
RUN apt --yes --allow-unauthenticated install sudo apt-utils wget bash-completion curl

#environment helpers
RUN apt --yes --allow-unauthenticated install build-essential aptitude zip locate

#Dev helpers - Comment if you are not developing in this docker
RUN apt --yes --allow-unauthenticated install pkg-config vim byobu git

# Project specific
RUN apt --yes --allow-unauthenticated install nodejs npm python3.14-venv
RUN npm install -g typescript

COPY ./entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ./.bashrc /usr/local/bin/.bashrc
COPY ./uutils /etc/apt/preferences.d/uutils

ENTRYPOINT ["sh", "/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]
