FROM nginx:alpine
# מוריד את ה-frontend-repo מהנתיב כי אנחנו כבר בתוכו
COPY src/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80