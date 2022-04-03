using System;
using System.Linq;

namespace HumanDateParser
{
    public class DateParser
    {
        private static DateRange Eval(string str)
        {
            var parser = new Parser(new Lexer(new CharacterBuffer(str, 3)));
            return parser.Eval();
        }

        public static DateTime Parse(string str)
        {
            var range = Eval(str);
            return range.Dates.FirstOrDefault();
        }

    }

}
Console.WriteLine ("Hello, World");
using HumanDateParser
//HumanDateParser.DateParser.Parse("15th feb 2010 at 5:30pm")
