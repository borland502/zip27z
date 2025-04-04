FROM --platform=linux/amd64 oven/bun:debian

RUN mkdir -p ~/.local/bin

# Config Bun
ENV PATH="/home/linuxbrew/.linuxbrew/bin:~/.local/bin:~/.bun/bin:${PATH}"
RUN ln -s /usr/local/bin/bun /usr/local/bin/node

# Update packages
RUN if [ "debian" == "alpine" ] ; then apk update ; else apt-get update ; fi

# Install Git
RUN if [ "debian" == "alpine" ] ; then apk add git ; else apt-get install -y git ; fi

USER vscode