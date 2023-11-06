FROM public.ecr.aws/lambda/nodejs:18
WORKDIR /var/task

ARG FIREFOX_VERSION
ARG GECKODRIVER_VERSION
ENV BROWSER_NAME="firefox"
ENV BROWSER_VERSION="${FIREFOX_VERSION}"

COPY ./containers/firefox.sh .
RUN ./firefox.sh && rm ./firefox.sh

COPY ./dist/judge .

CMD [ "index.handler" ]
