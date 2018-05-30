function jm_calendar(parent, options) {
    if (typeof parent !== "object" || !parent.appendChild) {
        throw "Parent is not an element!";
    }

    //data setup starts here
    var mainThis = this;
    var today = new Date();
    var current_month = new Date(today);
    var selected_date = new Date();
    var month_int_to_str = [ "January","February","March","April","May","June","July","August","September","October","November","December" ];
    var day_int_to_str = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
    var all_days = {};
    var calendar_events = options.calendar_events || [];
    this.calendar_events = calendar_events;
    this.name = parent.getAttribute("data-name");
    this.selected_date = selected_date;

    //calendar hookable events
    this.on_select = options.on_select || null;
    this.on_view = options.on_view || null;
    this.on_close = options.on_close || null;
    this.on_day_view_large = options.on_day_view_large || null;
    this.on_edit_event = options.on_edit_event || null;

    //calendar options/default behavior
    this.display_default_footer = options.display_default_footer || true;

    //  parent will append the container
    //  container dimensions and position will conform to parent
    //  build container template
    var container = document.createElement("div");
    this.container = container;
    container.className = "jm_calendar_container";

    /*

        quick test

    */
    var curve = curve_generator([{x: .41, y: .62}, {x: .21, y: 1}]);
    var scroll_timing_function = function(t) {
        return curve(t).y;
    }
    var last_y = null;
    var scroll_target = null;
    var scrolling = false;
    function allow_scroll() {
        scrolling = false;
    }
    container.addEventListener("touchmove",function(e) {
        e.preventDefault();
        if (scrolling) { return; }
        if (last_y == null) {
            last_y = e.touches[0].clientY;
            return;
        }
        var dist = e.touches[0].clientY - last_y;
        last_y = e.touches[0].clientY;
        if (smooth_scroll && scroll_target == container.parentElement) {
            scrolling = true;
            var dest = 0;
            if (dist < 1) {
                dest = footer.offsetTop;
            }
            smooth_scroll(scroll_target,dest,700,scroll_timing_function).then(allow_scroll);
        } else {
            scroll_target.scrollTop -= dist;
        }
        //scroll_target.scrollTop -= dist;
    });
    container.addEventListener("touchend",function(e) {
        last_y = null;
    });

    /*
        end quick test
    */

    var header = document.createElement("div");
    this.header = header;
    header.className = "jm_calendar_header";

    var body = document.createElement("div");
    this.body = body;
    body.className = "jm_calendar_body";

    var footer = document.createElement("div");
    this.footer = footer;
    footer.className = "jm_calendar_footer";

    container.appendChild(header);
    container.appendChild(body);
    container.appendChild(footer);

    //build header, body, and footer templates

  //header template
    var button_previous = document.createElement("div");
    button_previous.className = "jm_calendar_button previous";
    button_previous.innerHTML = "-";

    var button_month = document.createElement("div");
    button_month.innerHTML = month_int_to_str[current_month.getMonth()];
    button_month.className = "jm_calendar_button month";

    var button_next = document.createElement("div");
    button_next.className = "jm_calendar_button next";
    button_next.innerHTML = "+";

    var button_year = document.createElement("div");
    button_year.innerHTML = current_month.getFullYear();
    button_year.className = "jm_calendar_button year";

    var button_close = document.createElement("div");
    button_close.style.cssText =    `align-self: right; user-select: none; width: 100%; height: 1.2rem; margin-bottom: 3px;
                                    border-radius: 10px; border: 1px solid RGBA(192,192,192,.5); opacity: .5; position: relative;`;
    var button_close_x = document.createElement("div");
    button_close_x.innerHTML = "x";
    button_close_x.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);`
    button_close.appendChild(button_close_x);

    header.appendChild(button_close);
    header.appendChild(button_previous);
    header.appendChild(button_month);
    header.appendChild(button_next);
    header.appendChild(button_year);

    button_close.addEventListener("click",function() {
        if (typeof mainThis.on_close == "function") {
            mainThis.on_close(mainThis);
        }
    });
    button_previous.addEventListener("click",function() {
        change_month_additive(-1);
    });
    button_month.addEventListener("click",function() {
        var current_month_int = current_month.getMonth();
        var tmp_container = document.createElement("div");
        var overlay = document.createElement("div");
        overlay.style.cssText ="position: fixed; left: 0; top: 0; width: 110vw; height: 110vh; z-index: 1;";

        tmp_container.className = "select-month container";
        tmp_container.style.cssText =   `overflow: auto; position: absolute; left: 0; top: 0; width: calc(100% - 18px); 
                                        background-color: white; border: 0px solid RGBA(192,192,192,.5);
                                        padding: 0px; z-index: 2; transition: all .5s ease; height: 0%; min-height: 0px;`;
        
        scroll_target = tmp_container;

        var button_container = document.createElement("div");
        button_container.style.cssText = "display: inline-block; width: 85%;";

        var button_close = document.createElement("div");
        button_close.style.cssText =    `display: inline-block; margin: auto; vertical-align: top; user-select: none; width: 1.2rem; height: 1.2rem; 
                                        border-radius: 50%; border: 1px solid RGBA(192,192,192,.5); opacity: .5; position: relative;`;
        var button_close_x = document.createElement("div");
        button_close_x.innerHTML = "x";
        button_close_x.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);`

        button_close.appendChild(button_close_x);

        button_close.addEventListener("click",cancel);

        for (var i = 0; i < 12; i++) {
            var month_str = month_int_to_str[i];
            var new_month_button = document.createElement("div");
            new_month_button.className = "jm_calendar_button select-month";
            if (i == today.getMonth()) { new_month_button.className += " today"; }
            new_month_button.innerHTML = month_str;
            new_month_button.style.cssText = "width: 7.5em; margin: 3px 3px;";
            new_month_button.setAttribute("data-month-int",i);

            new_month_button.addEventListener("click",function(e) {
                change_month(this.getAttribute("data-month-int"));
                cancel(e);
            });

            button_container.appendChild(new_month_button);
        }
        tmp_container.appendChild(button_container);
        tmp_container.appendChild(button_close);
        header.appendChild(overlay);
        header.appendChild(tmp_container);

        setTimeout(function() {
            tmp_container.style.cssText += "height: auto; min-height: unset; max-height: unset;";
            var h = tmp_container.offsetHeight;
            var m = parent.offsetHeight - 30;
            tmp_container.style.cssText += "height: 0px; min-height: 0px;";
            if (h > m ) { h = m }
            setTimeout(function() {
                tmp_container.style.cssText += `height: 100%; min-height: ${h}px; padding: 7px 0px; border: 2px solid RGBA(192,192,192,.5);`;
                overlay.addEventListener("click",cancel);
            }, 100);

            
        }, 100);

        function cancel(e) {
            console.log("Switching scroll target back to container.parentElement");
            scroll_target = container.parentElement;
            if (e.target.className == "select-month container") {
                return;
            }
            tmp_container.style.cssText += "height: 0%; min-height: 0px; padding: 0px; border: 0px solid RGBA(192,192,192,.5);";
            setTimeout(function() {
                tmp_container.parentElement.removeChild(tmp_container);
            }, 500);
            overlay.removeEventListener("click",cancel);
            overlay.parentElement.removeChild(overlay);
            button_close.removeEventListener("click",cancel);
        }
    });
    button_next.addEventListener("click",function() {
        change_month_additive(1);
    });
    button_year.addEventListener("click",function() {        
        var tmp_container = document.createElement("div");
        var overlay = document.createElement("div");
        overlay.style.cssText ="position: fixed; left: 0; top: 0; width: 110vw; height: 100vh; z-index: 1;";

        tmp_container.className = "select-year container";
        tmp_container.style.cssText =   `overflow: auto; position: absolute; left: 0; top: 0; width: calc(100% - 18px); 
                                        background-color: white; border: 0px solid RGBA(192,192,192,.5);
                                        padding: 0px; z-index: 2; transition: all .5s ease; height: 0%; min-height: 0px;`;

        scroll_target = tmp_container;

        var button_container = document.createElement("div");
        button_container.style.cssText = "display: inline-block; width: 85%;";

        var button_close = document.createElement("div");
        button_close.style.cssText =    `display: inline-block; margin: auto; vertical-align: top; user-select: none; width: 1.2rem; height: 1.2rem; 
                                        border-radius: 50%; border: 1px solid RGBA(192,192,192,.5); opacity: .5; position: relative;`;
        var button_close_x = document.createElement("div");
        button_close_x.innerHTML = "x";
        button_close_x.style.cssText = `position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%);`

        button_close.appendChild(button_close_x);

        button_close.addEventListener("click",cancel);

        for (var i = -7; i < 7; i++) {
            var year = current_month.getFullYear() + i;
            var new_year_button = document.createElement("div");
            new_year_button.className = "jm_calendar_button select-year";
            if (year == today.getFullYear()) { new_year_button.className += " today"; }
            new_year_button.innerHTML = year;
            new_year_button.style.cssText = "width: 4.5em; margin: 3px 3px;";
            new_year_button.setAttribute("data-year-int",year);

            new_year_button.addEventListener("click",function(e) {
                change_year(this.getAttribute("data-year-int"));
                cancel(e);
            });

            button_container.appendChild(new_year_button);
        }
        tmp_container.appendChild(button_container);
        tmp_container.appendChild(button_close);
        header.appendChild(overlay);
        header.appendChild(tmp_container);

        setTimeout(function() {
            tmp_container.style.cssText += "height: 100%; min-height: 225px; padding: 7px 0px; border: 2px solid RGBA(192,192,192,.5);";
            overlay.addEventListener("click",cancel);
            
        }, 100);

        function cancel(e) {
            console.log("Cancel initiated");
            scroll_target = container.parentElement;
            if (e.target.className == "select-year container") {
                console.log("Cancel cancelled!");
                return;
            }
            tmp_container.style.cssText += "height: 0%; min-height: 0px; padding: 0px; border: 0px solid RGBA(192,192,192,.5);";
            setTimeout(function() {
                tmp_container.parentElement.removeChild(tmp_container);
            }, 500);
            overlay.removeEventListener("click",cancel);
            overlay.parentElement.removeChild(overlay);
            button_close.removeEventListener("click",cancel);
        }
    })

  //end header template


  //body template
    var labels = ["SU","M","T","W","TH","F","S"];
    for (l of labels) {
        var new_label = document.createElement("label");
        new_label.className = "jm_calendar_label";
        new_label.innerHTML = l;
        body.appendChild(new_label);
    }
    for (var i = 0; i < 7; i++) {
        for (var a = 0; a < 6; a++) {
            var coordinate = `${i},${a}`;
            var new_day = document.createElement("div");
            new_day.className = "jm_calendar_day";
            new_day.setAttribute("data-coordinate",coordinate);
            
            var day_label = document.createElement("label");
            day_label.innerHTML = `${i},${a}`;

            new_day.removeEventListener("click",day_select);
            new_day.addEventListener("click",day_select);

            day_label.removeEventListener("click",day_view_large);
            day_label.addEventListener("click",day_view_large);

            new_day.appendChild(day_label);
            body.appendChild(new_day);
            all_days[coordinate] = {
                container: new_day,
                label: day_label,
            }
        }
    }
  //end body template

  //footer template

  //end footer template

    //calendar templating is finished

    //calendar action events
    function day_select(e, trigger,preselect_event) {
        if (e.stopImmediatePropagation)
            e.stopImmediatePropagation();
        if (typeof trigger == "undefined") { trigger = true; }
        var target = e.target;
        var default_prevented = false;
        if (trigger && typeof mainThis.on_select == "function") {
            default_prevented = !mainThis.on_select({this: mainThis, target: target});
        }

        if (!default_prevented) {
            for (coordinate in all_days) {
                var cur_day = all_days[coordinate].container;
                cur_day.className = remove_class(cur_day.className, "selected");
            }


            target.className = add_class(target.className, "selected");
        }
        selected_date = new Date(target.getAttribute("data-mdy"));
        this.selected_date = selected_date;

        if (mainThis.display_default_footer) {
            var events = get_events_by_mdy(target.getAttribute("data-mdy"));
            footer.innerHTML = "";

            var col_1 = document.createElement("div");
            var col_2 = document.createElement("div");
            col_2.style.cssText = "display: grid; grid-template-columns: .5fr 1fr;";

            var date_div = document.createElement("div");
            date_div.innerHTML = selected_date.toDateString();
            var event_select_container = document.createElement("div");
            event_select_container.innerHTML = "Events: ";
            var event_select = document.createElement("select");
            var zero_option = document.createElement("option");
            zero_option.innerHTML = "Select An Event";
            event_select.appendChild(zero_option);
            for (var i = 0; i < events.length; i++) {
                var new_option = document.createElement("option");
                new_option.setAttribute("data-event-index",i);
                new_option.innerHTML = events[i].event_title.value;
                event_select.appendChild(new_option);
            }

            col_1.appendChild(date_div);
            if (events.length) {
                event_select.addEventListener("change",on_select_change);

                event_select_container.appendChild(event_select);
                col_1.appendChild(event_select_container);
            }

            if (preselect_event) {
                for (var i = 0; i < event_select.options.length; i++) {
                    var cur = events[event_select.options[i].getAttribute("data-event-index")];
                    if (cur == preselect_event) {
                        event_select.selectedIndex = i;
                        on_select_change();
                        break;
                    }
                }
            }
            function on_select_change() {
                col_2.innerHTML = "";
                var selected = event_select.options[event_select.selectedIndex];
                if (!selected.getAttribute("data-event-index")) { return; }
                var event = events[selected.getAttribute("data-event-index")];
                col_2.setAttribute("data-event-index",selected.getAttribute("data-event-index"));
                for (key in event) {
                    /*
                        sample event:
                        {
                            event_name: {
                                display: true,
                                display_name: 'Title',
                                value: "Event Name"
                            },
                            event_mdy: {
                                display: true,
                                display_name: 'Date',
                                value: '10/02/2018',
                            },
                            time: {
                                display: false,
                                value: 1234213412,
                            }
                        }
                    */
                    if (event[key] && (event[key].display == "true" || event[key].display == true)) {

                    } else {
                        continue;
                    }
                    var key_div = document.createElement("div");
                    key_div.innerHTML = event[key].display_name;
                    var value_div = document.createElement("div");
                    value_div.innerHTML = event[key].value;

                    col_2.appendChild(key_div);
                    col_2.appendChild(value_div);
                }
            }
            col_2.addEventListener("click",function(e) {
                on_click_event({this: mainThis, event: events[this.getAttribute("data-event-index")]});
            })
            function on_click_event(_data) {
                if (options.on_edit_event && typeof options.on_edit_event == "function") {
                    options.on_edit_event(_data);
                }
            }

            footer.appendChild(col_1);
            footer.appendChild(col_2);
        }

    }
    function day_select_by_mdy(mdy,trigger) {
        for (coordinate in all_days) {
            var cur_mdy = all_days[coordinate].container.getAttribute("data-mdy");
            if (cur_mdy == mdy) {
                day_select({target: all_days[coordinate].container},trigger);
                return;
            }
        }
    }
    this.day_select = day_select_by_mdy;
    function view(e,calendar_event) {
        if (e.stopImmediatePropagation)
            e.stopImmediatePropagation();
        if (typeof mainThis.on_view == "function") {
            mainThis.on_view(calendar_event);
        }
        day_select({target: e.target.parentElement},false,calendar_event);
        
        scrolling = true;
        var dest = footer.offsetTop;
        smooth_scroll(container.parentElement,dest,700,scroll_timing_function).then(allow_scroll);
    }
    this.view = view;
    //  event objects on the calendar need to be maleable and adjustable with as few
    //  necessary keys as possible; however, event_mdy and event_title will be needed for every event
    function add_event(e) {
        calendar_events.push(e);
        calendar_events_setup();
    }
    this.add_event = add_event;

    //calendar setup functions go here
    function days_setup() {
        var calendar_array = [];

        var this_month = new Date(current_month);
        this_month.setDate(1);
        var starting_day_of_week = this_month.getDay();
        var days_in_this_month = date_get_days_in_month(this_month);
        var need_days_from_last_month = starting_day_of_week;

        var last_month = new Date(this_month);
        last_month.setDate(0);
        var days_in_last_month = date_get_days_in_month(last_month);
        //push in last month's final days first
        while (need_days_from_last_month > 0) {
            last_month.setDate(days_in_last_month - (need_days_from_last_month - 1) );
            var mdy = date_to_mdy(last_month);
            var day_obj = {
                mdy: mdy,
                day_number: last_month.getDate(),
                add_class: "disabled",
            };
            calendar_array.push(day_obj);
            need_days_from_last_month--;
        }
        //push in this month's days
        for (var i = 1; i < days_in_this_month + 1; i++) {
            this_month.setDate(i);
            var mdy = date_to_mdy(this_month);
            var day_obj = {
                mdy: mdy,
                day_number: this_month.getDate(),
                remove_class: "disabled"
            };
            if (mdy == date_to_mdy(today)) {
                day_obj["add_class"] = "today";
            }

            calendar_array.push(day_obj);
        }
        //the remaining slots are to be filled by the next month's beginning days
        var remainder = 42 - calendar_array.length;
        var next_month = new Date(this_month);
        next_month.setDate(days_in_this_month + 1);
        for(var i = 1; i < remainder + 1; i++) {
            next_month.setDate(i);
            var day_obj = {
                mdy: date_to_mdy(next_month),
                day_number: next_month.getDate(),
                add_class: "disabled",
            };
            calendar_array.push(day_obj);
        }

        for (var i = 0; i < calendar_array.length; i++) {
            var x = 0;
            var y = i;
            while (y > 5) {
                x++;
                y -= 6;
            }
            var coordinate = `${x},${y}`;
            var cur_obj = all_days[coordinate];
            cur_obj.label.innerHTML = calendar_array[i].day_number;
            cur_obj.container.setAttribute("data-mdy",calendar_array[i].mdy);
            if (calendar_array[i].add_class) {
                var c = calendar_array[i].add_class;
                var list = cur_obj.container.className.split(" ");
                if (list.indexOf(c) == -1) {
                    list.push(c);
                    cur_obj.container.className = list.join(" ");
                }
            }
            if (calendar_array[i].remove_class) {
                var c = calendar_array[i].remove_class;
                var list = cur_obj.container.className.split(" ");
                if (list.indexOf(c) != -1) {
                    list.splice(list.indexOf(c),1);
                    cur_obj.container.className = list.join(" ");
                }
            }

        }
        clear_events_from_calendar();
        calendar_events_setup();
    }
    function calendar_events_setup() {
        clear_events_from_calendar();
        for (var i = 0; i < calendar_events.length; i++) {
            var event_mdy = calendar_events[i].event_mdy.value;
            var event_title = calendar_events[i].event_title.value;
            if (!event_mdy || !event_title) { console.log("Missing event_mdy or event_title!"); continue; }
            var day_div = get_day_by_mdy(event_mdy);
            if (!day_div) { continue; }
            var event_div = document.createElement("div");
            event_div.setAttribute("data-event-index",i);
            event_div.className = "jm_calendar_event";
            event_div.innerHTML = event_title;
            calendar_events[i].ele = event_div;


            [].forEach.call([calendar_events[i]],function(event) {
                event_div.removeEventListener("click",tmp_view);
                event_div.addEventListener("click",tmp_view)

                function tmp_view(e) {
                    view(e,event);
                }
            });
            day_div.appendChild(event_div);
        }
    }
    this.calendar_events_setup = calendar_events_setup;
    function clear_events_from_calendar() {
        for (coordinate in all_days) {
            var cur_day = all_days[coordinate].container;
            for (var i = 0; i < cur_day.children.length; i++) {
                var cur_child = cur_day.children[i];
                if (cur_child.className.split(" ").indexOf("jm_calendar_event") != -1) {
                    cur_day.removeChild(cur_child);
                    i--;
                }
            }
        }
    }

    //utility functions go here
    function date_to_mdy(d) {
        var str = "";
        var month = d.getMonth() + 1;
        if (month < 10) { month = "0" + month; }
        var day = d.getDate();
        if (day < 10) { day = "0" + day; }
        var year = d.getFullYear();

        str = month + "/" + day + "/" + year;
        return str;
    }
    this.date_to_mdy = date_to_mdy;
    function date_get_days_in_month(d) {
        return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    }
    function remove_class(str, c) {
        str = str || "";
        var arr = str.split(" ");
        if (arr.indexOf(c) != -1) {
            arr.splice(arr.indexOf(c),1);
        }
        return arr.join(" ");
    }
    function add_class(str, c) {
        str = str || "";
        var arr = str.split(" ");
        if (arr.indexOf(c) == -1) {
            arr.push(c);
        }
        return arr.join(" ");
    }
    function get_day_by_mdy(mdy) {
        for (coordinate in all_days) {
            var cur_day = all_days[coordinate].container;
            if (cur_day.getAttribute("data-mdy") == mdy) {
                return cur_day;
            }
        }
        return false;
    }
    function get_events_by_mdy(mdy) {
        var result = [];
        for (var i = 0; i < calendar_events.length; i++) {
            var cur = calendar_events[i];
            if (cur.event_mdy.value == mdy) {
                result.push(cur);
            }
        }
        return result;
    }

    //calendar use functions go here
    /*
        number_of_months: the number of months positive or negative to change the current month by
    */
    function change_month_additive(number_of_months) {
        if (typeof number_of_months == "string") { number_of_months = parseFloat(number_of_months); }
        current_month.setMonth(current_month.getMonth() + number_of_months);

        days_setup();
        button_month.innerHTML = month_int_to_str[current_month.getMonth()];
        button_year.innerHTML = current_month.getFullYear();
    }
    function change_month(to_month) {
        current_month.setMonth(to_month);

        days_setup();
        button_month.innerHTML = month_int_to_str[current_month.getMonth()];
        button_year.innerHTML = current_month.getFullYear();
    }
    function change_year(to_year) {
        current_month.setFullYear(to_year);

        days_setup();
        button_month.innerHTML = month_int_to_str[current_month.getMonth()];
        button_year.innerHTML = current_month.getFullYear();
    }
    function day_view_large(e) {
        e.stopImmediatePropagation();
        if (options.on_day_view_large && typeof options.on_day_view_large == "function") {
            var allow = options.on_day_view_large({this: mainThis, target: e.target});
            if (!allow) {
                return;
            }
        }
        console.log("Clicked label!");
        var target = e.target.parentElement;
        var calc = getComputedStyle(target);
        var background_color = calc.backgroundColor;
        var rect = target.getBoundingClientRect();
        var container_rect = container.parentElement.getBoundingClientRect();
        var clone = target.cloneNode(true);
        var animation_speed = 500;

        var overlay = document.createElement("div");
        overlay.style.cssText ="position: fixed; left: 0; top: 0; width: 110vw; height: 100vh; z-index: 1;";
        scroll_target = clone;

        clone.className += " day_view_large";
        var clone_label = null;
        for (var i = 0; i < clone.children.length; i++) {
            var cur = clone.children[i];
            if (cur.tagName.toLowerCase() == "label") {
                clone_label = cur;
            } else if (cur.className.indexOf("jm_calendar_event") != -1) {
                cur.removeEventListener("click",tmp_view);
                cur.addEventListener("click",tmp_view)

                function tmp_view(_e) {
                    var _event = calendar_events[clone.children[1].getAttribute("data-event-index")];
                    cancel();
                    view(_e,_event);
                }
            }
        }

        var solid_background_color = calc.backgroundColor;
        if (solid_background_color.toLowerCase().indexOf("rgba") != -1) {
            var match = solid_background_color.match(/\(.+[^\)]\)/);
            if (match && solid_background_color.toLowerCase()  != "rgba(0, 0, 0, 0)") { 
                match = match[0];
                solid_background_color = match.substring(1,match.length-1).split(",");
                solid_background_color[3] = "1";
                solid_background_color = "RGBA(" + solid_background_color.join(",") + ")";
            } else {
                solid_background_color = "RGBA(255,255,255,1);";
            }
        }

        var starting_css_text =     `position: fixed; max-height: unset; left: 0; top: 0; transform: translate3d(${rect.left}px,${rect.top}px,0px); 
                                    width: ${rect.width}px; height: ${rect.height}px; background-color: ${background_color};
                                    transition: all ${animation_speed}ms ease; z-index: 2; will-change: width, height, transform;`;
        target.parentElement.appendChild(overlay);
        target.parentElement.appendChild(clone);

        clone.style.cssText += starting_css_text;

        overlay.addEventListener("click",cancel);
        setTimeout(function() {
            var l = container_rect.left + 30;
            var t = container_rect.top + 15;
            var h = container_rect.height - 30;
            clone.style.cssText += `transform: translate3d(${l}px,${t}px,0px);
                                    width: ${container_rect.width - 60}px; height: ${h - 30}px;
                                    background-color: ${solid_background_color};`;

            clone_label.addEventListener("click",cancel);
        }, 100);


        function cancel(e) {
            if (e && e.stopImmediatePropagation)
                e.stopImmediatePropagation();
            setTimeout(function() {
                clone.style.cssText += starting_css_text;
                clone_label.removeEventListener("click",cancel);
                setTimeout(function() {
                    clone.parentElement.removeChild(clone);

                    scroll_target = container.parentElement;

                    overlay.removeEventListener("click",cancel);
                    overlay.parentElement.removeChild(overlay);
                }, animation_speed);
            }, 100);
        }
    }
    



    //initial setup
    function on_start() {
        parent.appendChild(container);
        scroll_target = container.parentElement;
        days_setup();
        day_select_by_mdy(date_to_mdy(today),false);
        calendar_events_setup();
    }


    on_start();
}
