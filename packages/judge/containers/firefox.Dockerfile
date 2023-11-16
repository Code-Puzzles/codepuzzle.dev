FROM public.ecr.aws/lambda/nodejs:18
WORKDIR /var/task

ARG DEV_LOOP
ARG FIREFOX_VERSION
ARG GECKODRIVER_VERSION

ENV DEV_LOOP="${DEV_LOOP}"
ENV BROWSER_NAME="firefox"
ENV BROWSER_VERSION="${FIREFOX_VERSION}"

COPY ./packages/judge/containers/firefox.sh .
RUN ./firefox.sh && rm ./firefox.sh

COPY ./packages/judge/containers/dev-loop.sh /dev-loop.sh
COPY ./dist-bundles/judge .

CMD [ "index.handler" ]
