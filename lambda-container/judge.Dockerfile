FROM public.ecr.aws/lambda/nodejs:18
WORKDIR /var/task
COPY . ${LAMBDA_TASK_ROOT}
RUN npm ci && rm package.json package-lock.json
RUN yum install -y gtk3
ARG VERSION
RUN yum install -y tar xz && \
  curl -L "https://download-installer.cdn.mozilla.net/pub/firefox/releases/${VERSION}/linux-x86_64/en-US/firefox-${VERSION}.tar.bz2" | tar -xj -C /opt && \
  yum remove -y tar xz && yum clean all
CMD [ "index.handler" ]
