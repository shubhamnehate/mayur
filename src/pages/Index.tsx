import Navigation from "@/components/Navigation";
import Hero from "@/components/Hero";
import InstructorsShowcase from "@/components/InstructorsShowcase";
import FeaturedCourses from "@/components/FeaturedCourses";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <Hero />
      <FeaturedCourses />
      <InstructorsShowcase />
      <Footer />
    </div>
  );
};

export default Index;
