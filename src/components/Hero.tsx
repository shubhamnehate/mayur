import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative py-20 md:py-32 px-4 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 gradient-hero -z-10"></div>
      
      {/* Animated Glow Effect */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow -z-10"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-glow -z-10" style={{ animationDelay: "1s" }}></div>

      <div className="container mx-auto max-w-6xl text-center relative">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full mb-8 animate-fade-in">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">Industry-level training for engineers</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-accent">
          Master Autonomous Driving & AI
        </h1>

        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto animate-fade-in">
          Hands-on, industry-level bootcamps for Autonomous Driving, AI & Robotics. Learn from experts with 6+ years at Waymo, Siemens, and Waabi.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
          <Link to="/courses">
            <Button size="lg" className="gradient-primary group text-lg px-8">
              Explore Courses
              <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="text-lg px-8">
            Join Newsletter
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-8 mt-20 animate-fade-in">
          {[
            { value: "6+", label: "Years Industry Experience" },
            { value: "25+", label: "Students Trained" },
            { value: "6", label: "Expert Bootcamps" },
          ].map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-4xl md:text-5xl font-bold gradient-primary bg-clip-text text-transparent mb-2">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
