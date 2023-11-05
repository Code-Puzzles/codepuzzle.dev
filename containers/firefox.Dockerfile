FROM public.ecr.aws/lambda/nodejs:18
WORKDIR /var/task

RUN yum makecache fast
RUN yum install -y gtk3 alsa-lib dbus-glib tar xz bzip2

ARG FIREFOX_VERSION
ENV BROWSER_NAME="firefox"
ENV BROWSER_VERSION="${FIREFOX_VERSION}"
RUN curl -L "https://download-installer.cdn.mozilla.net/pub/firefox/releases/${FIREFOX_VERSION}/linux-x86_64/en-US/firefox-${FIREFOX_VERSION}.tar.bz2" | tar -xj -C /opt

ARG GECKODRIVER_VERSION
RUN curl -L "https://github.com/mozilla/geckodriver/releases/download/v${GECKODRIVER_VERSION}/geckodriver-v${GECKODRIVER_VERSION}-linux64.tar.gz" | tar -xz -C /opt

RUN yum remove -y tar xz bzip2 && yum clean all && rm -rf /var/cache/yum

COPY . .
CMD [ "index.handler" ]
