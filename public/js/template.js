var template = {
    HTML:function(title,list,body,control){
        return `
        <!doctype html>
        <html>
            <head>
              <title>WEB1 - ${title}</title>
              <meta charset="utf-8">
            </head>
            <body>
              <h1><a href="/">WEB</a></h1>
              ${list}
              ${control}
              ${body}
            </body>
        </html>
        `;
    },
    list:function(contents){
        var list = '<ul>';
        var i = 0;
        while(i < contents.length){
            list = list + `<li><a href="/?id=${contents[i].id}">${contents[i].b_title}</a></li>`;
            i = i + 1;
        }
        list = list + '</ul>';
        return list;
    }
}

module.exports = template;
