FROM nginx:alpine

# מחק את הקובץ הדיפולטי של Nginx קודם ליתר ביטחון
RUN rm /etc/nginx/conf.d/default.conf

# העתק את הקבצים (ודא שאתה עומד בתיקייה הנכונה בזמן ה-build)
COPY src/ /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/templates/default.conf.template

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]